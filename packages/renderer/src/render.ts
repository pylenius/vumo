import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir, cpus } from 'node:os';
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
  workers?: number;
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
    let __vumoState = 0xdeadbeef >>> 0;
    Math.random = function () {
      __vumoState = (Math.imul(__vumoState, 1664525) + 1013904223) >>> 0;
      return __vumoState / 0xffffffff;
    };
    window.__vumoReseed = function (seed) {
      let s = (seed >>> 0) * 2654435761 >>> 0;
      s ^= s >>> 16;
      s = Math.imul(s, 0x85ebca6b) >>> 0;
      s ^= s >>> 13;
      __vumoState = (s || 1) >>> 0;
    };
    const realPerfNow = performance.now.bind(performance);
    performance.now = function () {
      return typeof window.__vumoTimeMs === 'number' ? window.__vumoTimeMs : realPerfNow();
    };
    const realDateNow = Date.now;
    Date.now = function () {
      return typeof window.__vumoTimeMs === 'number' ? (window.__vumoTimeMs | 0) : realDateNow();
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

async function preparePage(
  browser: Browser,
  url: string,
  comp: CompositionInfo,
): Promise<Page> {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(DETERMINISM_SHIM);
  await page.setViewport({
    width: comp.width,
    height: comp.height,
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.waitForFunction('typeof window.__vumoSelectComposition === "function"', {
    timeout: 30_000,
  });
  await page.evaluate((id) => window.__vumoSelectComposition!(id), comp.id);
  await page.waitForFunction(
    () =>
      typeof window.__vumoSetFrame === 'function' &&
      typeof window.__vumoReadyForCapture === 'function',
    { timeout: 30_000 },
  );
  return page;
}

async function captureFrame(
  page: Page,
  frame: number,
  fps: number,
  width: number,
  height: number,
): Promise<Buffer> {
  // Set frame + flush Vue's microtask queue twice so the reactive update lands.
  await page.evaluate(
    async ({ f, ms }: { f: number; ms: number }) => {
      window.__vumoReseed?.(f);
      window.__vumoTimeMs = ms;
      window.__vumoSetFrame!(f);
      // Two microtask boundaries — Vue 3's scheduler is microtask-based.
      await Promise.resolve();
      await Promise.resolve();
    },
    { f: frame, ms: (frame * 1000) / fps },
  );
  await page.waitForFunction('window.__vumoReadyForCapture && window.__vumoReadyForCapture()', {
    timeout: 30_000,
    polling: 16,
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
  const workers = Math.max(1, opts.workers ?? Math.min(cpus().length, 4));

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  let framesDir: string | null = null;

  try {
    server = await startDevServer(projectRoot);
    const url = getServerUrl(server);

    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 120_000,
      args: opts.puppeteerArgs ?? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=CalculateNativeWinOcclusion',
      ],
    });

    // Probe — discover registered compositions
    const probe = await browser.newPage();
    await probe.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
    await probe.waitForFunction('typeof window.__vumoListCompositions === "function"', {
      timeout: 30_000,
    });
    const all = await probe.evaluate(() => window.__vumoListCompositions!());
    const comp = all.find((c) => c.id === opts.compositionId);
    if (!comp) {
      const available = all.map((c) => `"${c.id}"`).join(', ') || '(none)';
      throw new Error(
        `[vumo] Composition "${opts.compositionId}" not found. Available: ${available}`,
      );
    }
    await probe.close();

    // Spawn worker pages
    const effectiveWorkers = Math.min(workers, comp.durationInFrames);
    const pages = await Promise.all(
      Array.from({ length: effectiveWorkers }, () => preparePage(browser!, url, comp)),
    );

    framesDir = await mkdtemp(join(tmpdir(), 'vumo-frames-'));

    let completed = 0;
    const total = comp.durationInFrames;
    const reportProgress = (): void => {
      completed += 1;
      opts.onProgress?.({ frame: completed, total, stage: 'capture' });
    };

    await Promise.all(
      pages.map(async (page, workerIdx) => {
        for (let f = workerIdx; f < total; f += effectiveWorkers) {
          const buf = await captureFrame(page, f, comp.fps, comp.width, comp.height);
          const padded = String(f).padStart(6, '0');
          await writeFile(join(framesDir!, `frame-${padded}.png`), buf);
          reportProgress();
        }
      }),
    );

    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));

    opts.onProgress?.({ frame: 0, total, stage: 'encode' });
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
    __vumoReseed?: (seed: number) => void;
    __vumoListCompositions?: () => CompositionInfo[];
    __vumoSelectComposition?: (id: string) => void;
    __vumoSetFrame?: (n: number) => void;
    __vumoReadyForCapture?: () => boolean;
    __vumoPendingHandles?: () => string[];
  }
}
