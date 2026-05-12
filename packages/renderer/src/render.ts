import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';
import { encodeH264 } from './ffmpeg.js';

export interface RenderProgress {
  frame: number;
  total: number;
  stage: 'capture' | 'encode';
}

export interface RenderOptions {
  projectRoot: string;
  compositionId: string;
  output: string;
  crf?: number;
  onProgress?: (progress: RenderProgress) => void;
  puppeteerArgs?: string[];
}

interface CompositionInfo {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

const DETERMINISM_SHIM = `
  (() => {
    let __vumoSeed = 0xdeadbeef >>> 0;
    Math.random = function () {
      __vumoSeed = (Math.imul(__vumoSeed, 1664525) + 1013904223) >>> 0;
      return __vumoSeed / 0xffffffff;
    };
    // Time is frame-derived; set per-frame by the renderer via window.__vumoTimeMs.
    const realPerfNow = performance.now.bind(performance);
    performance.now = function () {
      return typeof window.__vumoTimeMs === 'number' ? window.__vumoTimeMs : realPerfNow();
    };
    const realDateNow = Date.now;
    Date.now = function () {
      return typeof window.__vumoTimeMs === 'number' ? window.__vumoTimeMs | 0 : realDateNow();
    };
  })();
`;

async function startDevServer(projectRoot: string): Promise<ViteDevServer> {
  const server = await createServer({
    root: projectRoot,
    server: {
      port: 0,
      strictPort: false,
      hmr: false,
      host: '127.0.0.1',
    },
    clearScreen: false,
    logLevel: 'warn',
    optimizeDeps: { force: false },
  });
  await server.listen();
  return server;
}

function getServerUrl(server: ViteDevServer): string {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('[vumo] Failed to determine dev server address.');
  }
  return `http://127.0.0.1:${address.port}/?vumoRender=1`;
}

async function listCompositions(page: Page): Promise<CompositionInfo[]> {
  await page.waitForFunction('typeof window.__vumoListCompositions === "function"', {
    timeout: 30_000,
  });
  return page.evaluate(() => window.__vumoListCompositions!());
}

async function selectAndPrepare(page: Page, comp: CompositionInfo): Promise<void> {
  await page.evaluate((id) => window.__vumoSelectComposition!(id), comp.id);
  await page.waitForFunction(
    () => typeof window.__vumoSetFrame === 'function' && typeof window.__vumoReadyForCapture === 'function',
    { timeout: 30_000 },
  );
}

async function captureFrame(
  page: Page,
  frame: number,
  fps: number,
  width: number,
  height: number,
): Promise<Buffer> {
  await page.evaluate(
    ({ f, ms }: { f: number; ms: number }) => {
      window.__vumoTimeMs = ms;
      window.__vumoSetFrame!(f);
    },
    { f: frame, ms: (frame * 1000) / fps },
  );
  await page.waitForFunction(() => window.__vumoReadyForCapture!(), {
    timeout: 30_000,
  });
  return (await page.screenshot({
    type: 'png',
    omitBackground: false,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })) as Buffer;
}

export async function render(opts: RenderOptions): Promise<void> {
  const projectRoot = resolve(opts.projectRoot);
  const output = resolve(opts.output);
  const crf = opts.crf ?? 18;

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  let framesDir: string | null = null;

  try {
    server = await startDevServer(projectRoot);
    const url = getServerUrl(server);

    browser = await puppeteer.launch({
      headless: true,
      args: opts.puppeteerArgs ?? ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    // Probe page — discover registered compositions
    const probe = await browser.newPage();
    await probe.evaluateOnNewDocument(DETERMINISM_SHIM);
    await probe.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
    const all = await listCompositions(probe);
    const comp = all.find((c) => c.id === opts.compositionId);
    if (!comp) {
      const available = all.map((c) => `"${c.id}"`).join(', ') || '(none)';
      throw new Error(
        `[vumo] Composition "${opts.compositionId}" not found. Available: ${available}`,
      );
    }
    await probe.close();

    // Render page — viewport sized exactly to composition
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(DETERMINISM_SHIM);
    await page.setViewport({
      width: comp.width,
      height: comp.height,
      deviceScaleFactor: 1,
    });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
    await selectAndPrepare(page, comp);

    framesDir = await mkdtemp(join(tmpdir(), 'vumo-frames-'));

    for (let f = 0; f < comp.durationInFrames; f++) {
      const buf = await captureFrame(page, f, comp.fps, comp.width, comp.height);
      const padded = String(f).padStart(6, '0');
      await writeFile(join(framesDir, `frame-${padded}.png`), buf);
      opts.onProgress?.({ frame: f + 1, total: comp.durationInFrames, stage: 'capture' });
    }

    opts.onProgress?.({ frame: 0, total: comp.durationInFrames, stage: 'encode' });
    await encodeH264({
      framesDir,
      pattern: 'frame-%06d.png',
      fps: comp.fps,
      output,
      crf,
    });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (server) await server.close().catch(() => undefined);
    if (framesDir) await rm(framesDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

declare global {
  interface Window {
    __vumoTimeMs?: number;
    __vumoListCompositions?: () => CompositionInfo[];
    __vumoSelectComposition?: (id: string) => void;
    __vumoSetFrame?: (n: number) => void;
    __vumoReadyForCapture?: () => Promise<boolean>;
  }
}
