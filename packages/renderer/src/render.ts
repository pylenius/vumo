import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir, cpus } from 'node:os';
import { join, resolve } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';
import { encode } from './ffmpeg.js';
import {
  downloadAudio,
  mergeCuesFromWorkers,
  resolveAudioUrl,
  type AudioCue,
  type PreparedCue,
} from './audio.js';

export interface RenderProgress {
  frame: number;
  total: number;
  stage: 'capture' | 'audio' | 'encode';
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

function getServerOrigin(server: ViteDevServer): string {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('[vumo] Failed to determine dev server address.');
  }
  return `http://127.0.0.1:${address.port}`;
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
  await page.evaluate(
    async ({ f, ms }: { f: number; ms: number }) => {
      window.__vumoReseed?.(f);
      window.__vumoTimeMs = ms;
      window.__vumoSetFrame!(f);
      await Promise.resolve();
      await Promise.resolve();
    },
    { f: frame, ms: (frame * 1000) / fps },
  );
  await page.waitForFunction(
    'window.__vumoReadyForCapture && window.__vumoReadyForCapture()',
    { timeout: 30_000, polling: 16 },
  );
  return (await page.screenshot({
    type: 'png',
    omitBackground: false,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })) as Buffer;
}

async function collectAudioCues(pages: Page[]): Promise<AudioCue[]> {
  const perWorker = await Promise.all(
    pages.map((p) => p.evaluate(() => window.__vumoListAudioCues?.() ?? [])),
  );
  return mergeCuesFromWorkers(perWorker as AudioCue[][]);
}

async function prepareAudioCues(
  cues: AudioCue[],
  serverOrigin: string,
  outDir: string,
): Promise<PreparedCue[]> {
  return Promise.all(
    cues.map(async (cue, idx) => {
      const url = resolveAudioUrl(cue.src, `${serverOrigin}/`);
      const ext = url.split('?')[0]!.split('.').pop() || 'audio';
      const file = join(outDir, `cue-${idx}-${cue.id}.${ext}`);
      await downloadAudio(url, file);
      return { cue, file };
    }),
  );
}

export async function render(opts: RenderOptions): Promise<void> {
  const projectRoot = resolve(opts.projectRoot);
  const output = resolve(opts.output);
  const crf = opts.crf ?? 18;
  const workers = Math.max(1, opts.workers ?? Math.min(cpus().length, 4));

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  let framesDir: string | null = null;
  let audioDir: string | null = null;

  try {
    server = await startDevServer(projectRoot);
    const serverOrigin = getServerOrigin(server);
    const renderUrl = `${serverOrigin}/?vumoRender=1`;

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
    await probe.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
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

    const effectiveWorkers = Math.min(workers, comp.durationInFrames);
    const pages = await Promise.all(
      Array.from({ length: effectiveWorkers }, () => preparePage(browser!, renderUrl, comp)),
    );

    framesDir = await mkdtemp(join(tmpdir(), 'vumo-frames-'));

    let completed = 0;
    const total = comp.durationInFrames;

    await Promise.all(
      pages.map(async (page, workerIdx) => {
        for (let f = workerIdx; f < total; f += effectiveWorkers) {
          const buf = await captureFrame(page, f, comp.fps, comp.width, comp.height);
          const padded = String(f).padStart(6, '0');
          await writeFile(join(framesDir!, `frame-${padded}.png`), buf);
          completed += 1;
          opts.onProgress?.({ frame: completed, total, stage: 'capture' });
        }
      }),
    );

    // Audio cue collection happens AFTER capture so every Sequence-mounted
    // <Audio> has had a chance to register. Each worker page's registry is
    // queried and the union is taken.
    const cues = await collectAudioCues(pages);

    let preparedCues: PreparedCue[] = [];
    if (cues.length > 0) {
      opts.onProgress?.({ frame: 0, total: cues.length, stage: 'audio' });
      audioDir = await mkdtemp(join(tmpdir(), 'vumo-audio-'));
      preparedCues = await prepareAudioCues(cues, serverOrigin, audioDir);
    }

    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));

    opts.onProgress?.({ frame: 0, total, stage: 'encode' });
    await encode({
      framesDir,
      framesPattern: 'frame-%06d.png',
      fps: comp.fps,
      videoCrf: crf,
      audioCues: preparedCues,
      output,
    });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (server) await server.close().catch(() => undefined);
    if (framesDir) await rm(framesDir, { recursive: true, force: true }).catch(() => undefined);
    if (audioDir) await rm(audioDir, { recursive: true, force: true }).catch(() => undefined);
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
    __vumoListAudioCues?: () => AudioCue[];
  }
}
