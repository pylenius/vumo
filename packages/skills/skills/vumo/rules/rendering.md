# Rendering

The render path turns a registered composition into an MP4. Driven by `vumo render <id>`, implemented in `@vumo/renderer`.

## Pipeline

```
vumo render <id>
   │
   ▼
1. createServer({ root: projectRoot }) → Vite dev server, port 0
2. puppeteer.launch({ headless: true, ...throttle-disable flags })
3. Probe page: navigate, call __vumoListCompositions(), find <id>
4. Spawn N worker pages:
     - page.evaluateOnNewDocument(DETERMINISM_SHIM)
     - page.setViewport({ width, height, deviceScaleFactor: 1 })
     - page.goto(`${url}/?vumoRender=1`)
     - page.evaluate((id) => __vumoSelectComposition(id), id)
5. Round-robin frame distribution across workers. Per frame:
     a. __vumoReseed(frame)
     b. __vumoTimeMs = frame * 1000/fps
     c. __vumoSetFrame(frame)
     d. await Promise.resolve(); await Promise.resolve();   ← Vue microtask flush
     e. waitForFunction(__vumoReadyForCapture, polling: 16ms)
     f. page.screenshot({ type: 'png', clip })
     g. fs.writeFile(`frame-${pad6(frame)}.png`)
6. Union audio cues from all worker pages, download srcs, FFmpeg mux.
7. cleanup: browser.close(), server.close(), rm tmp dirs.
```

## CLI reference

```
vumo render <compositionId> [options]
  -p, --project <path>    Project root (default: cwd)
  -o, --output <path>     Output MP4 (default: out.mp4)
  --crf <0-51>            H.264 CRF, lower = better (default: 18)
  --workers <n>           Parallel render workers (default: min(cpu, 4))
```

## Performance

- **Single worker** baseline at 1280×720, simple composition: ~3.5–4 frames/sec.
- **2 workers** gives ~20% speedup. Diminishing returns past that because the Vite dev server transforms modules serially.
- **A future production-bundle path** (Vite build + serve static) will unblock true N× scaling. Until then, more than 4 workers rarely helps.

## Troubleshooting

### `Waiting failed: 30000ms exceeded`

Puppeteer's `waitForFunction(__vumoReadyForCapture)` timed out. Causes:

1. A `delayRender` handle was never `continueRender`'d. The renderer's harness throws with a `Stuck: <label>` message — read the label, fix the unclosed handle.
2. A font is still loading (`document.fonts.status === 'loading'`). Check that all `@font-face` declarations are actually present at composition mount.

### `Runtime.callFunctionOn timed out`

A single CDP call hung. With multiple workers on the same dev server, this usually means a worker page is waiting on RAF that's being throttled by Chrome's background-tab policy. The renderer launches with these flags to prevent it:

```
--disable-background-timer-throttling
--disable-renderer-backgrounding
--disable-backgrounding-occluded-windows
--disable-features=CalculateNativeWinOcclusion
```

If you see this error, double-check that you haven't `await page.evaluate(() => new Promise(r => requestAnimationFrame(r)))` inside your composition — RAF in background tabs is unreliable. Use microtasks instead.

### Composition "<id>" not found

`__vumoListCompositions()` didn't return your id. The composition probably wasn't registered before `vumoMount` ran. Check that `import './compositions';` (or whatever side-effecting import) is in `main.ts` **before** the `vumoMount('#app')` call.

### Audio missing from the MP4

- `<Audio>` is `<template>`-only — it doesn't render anything. If you can't see it in the DOM, that's expected.
- Cues are collected after capture by querying each worker page. If your `<Audio>` lives inside a `<Sequence>` whose visibility never overlapped with any captured frame on any worker, the cue won't register. Workaround: put `<Audio>` at the top of the composition (always-mounted).
- `ffprobe out.mp4` should show two streams: video (h264) and audio (aac). If only video, the cue collection turned up empty.

### Mismatched dimensions

The Puppeteer viewport is set to the composition's `width`/`height`. If your composition's root element is larger or has margins, the screenshot's `clip` will cut to exactly the composition box anyway. But if the root is **smaller** than the viewport, you'll get background pixels. Set the root to `{ width: '${width}px', height: '${height}px' }` explicitly.

## Tuning CRF

`--crf 18` is "visually lossless" for most content. Rough guide:

- `15` — archive-quality, very large file
- `18` — visually lossless, recommended default
- `23` — ffmpeg default, fine for most uses
- `28` — noticeable artifacts on flat color
- `35+` — only for previews / very small files

## When the render fails

Read the actual error before retrying with `--workers 1`. Most failures fall into one of the buckets above. Reducing workers is a workaround, not a fix — the underlying bug (stuck delayRender, mis-mounted composition, etc.) needs to be addressed.
