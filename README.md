# vumo

Make videos programmatically with Vue 3 — a Vue-native port of [Remotion](https://www.remotion.dev/).

> **Status:** `0.1.0` candidate. Vue primitives, scrubber preview, headless renderer with worker pool, `<Sequence>`, `<Audio>`, `delayRender`, tests, CI, and a [docs site](https://pylenius.github.io/vumo/) are in. Not yet published to npm.

## Quick start

```bash
pnpm install
pnpm dev:hello           # scrubber preview of examples/hello-world
pnpm --filter @vumo/example-hello-world render   # → out.mp4
```

`pnpm dev:hello` opens a Vite dev server with a scrubber, play/pause, and keyboard shortcuts (space, ←/→, J/K/L). The render script produces a deterministic h264 MP4.

## API

### Composables

```ts
import { useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();                  // Ref<number>
const { width, height, fps, durationInFrames } = useVideoConfig();
```

Anything that reads `frame.value` re-renders as the timeline advances. The video config is provided by whoever mounts the composition (preview UI or render harness).

### Defining compositions

```ts
import { defineComposition } from '@vumo/core';
import MyComposition from './MyComposition.vue';

defineComposition({
  id: 'hello-world',
  component: MyComposition,
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 150,
});
```

Compositions live in a registry that both the preview UI and the renderer read from. Each project's `src/main.ts` becomes a one-liner:

```ts
import { vumoMount } from '@vumo/preview';
import './compositions';

vumoMount('#app');
```

`vumoMount` checks the URL: `?vumoRender=1` switches to a headless harness that the renderer drives via `window.__vumoSelectComposition` / `__vumoSetFrame`. Otherwise it shows the scrubber preview.

### `<Sequence>` — time-shifting

```vue
<script setup lang="ts">
import { Sequence } from '@vumo/core';
</script>

<template>
  <Sequence :from="0"   :duration-in-frames="60"><Intro /></Sequence>
  <Sequence :from="60"  :duration-in-frames="60"><Middle /></Sequence>
  <Sequence :from="120" :duration-in-frames="60"><Outro /></Sequence>
</template>
```

Inside each `<Sequence>`, `useCurrentFrame()` returns a frame relative to that sequence's `from`. Children only mount while `from <= globalFrame < from + durationInFrames`.

### `<Audio>` — declarative audio cues

```vue
<script setup lang="ts">
import { Audio } from '@vumo/core';
</script>

<template>
  <Audio src="/bg.wav"     :from="0"   :duration-in-frames="180" :volume="0.4" />
  <Audio src="/beep-a.wav" :from="30"  :duration-in-frames="6"   :volume="0.9" />
  <Audio src="/beep-b.wav" :from="90"  :duration-in-frames="6"   :volume="0.9" />
</template>
```

`<Audio>` renders nothing visible — it registers an audio cue (src + global frame window + volume + optional loop/startOffset) into a per-page registry. The scrubber preview drives HTML5 `<audio>` elements that sync to the frame timer. The renderer collects cues from every worker page after capture, downloads each source from the dev server, and muxes them into the MP4 via FFmpeg's `adelay` + `amix` filters.

### `delayRender` / `continueRender` — async asset gate

```ts
import { onMounted } from 'vue';
import { delayRender, continueRender } from '@vumo/core';

onMounted(async () => {
  const handle = delayRender('load profile image');
  await fetch('/assets/avatar.png');     // or font loading, etc.
  continueRender(handle);
});
```

The renderer won't capture a frame until every pending handle has been continued.

## CLI

```
vumo render <compositionId> [options]

  -p, --project <path>    Project root (default: cwd)
  -o, --output <path>     Output MP4 (default: out.mp4)
  --crf <number>          H.264 CRF, lower = better (default: 18)
  --workers <number>      Parallel render workers (default: min(cpu, 4))
```

## How the renderer works

1. Spin up a Vite dev server in the project root (programmatic API, HMR disabled).
2. Launch headless Chromium via Puppeteer. Inject a determinism shim that seeds `Math.random` and clamps `Date.now` / `performance.now` to frame time.
3. Probe the page to enumerate registered compositions.
4. Spawn N worker pages, each navigating to `?vumoRender=1` and calling `window.__vumoSelectComposition(id)`.
5. Round-robin distribute frame indices across workers. Each capture:
   - `__vumoReseed(frame)` + `__vumoSetFrame(frame)` in `page.evaluate`, flush Vue's microtask queue
   - `waitForFunction(() => __vumoReadyForCapture())` — synchronous check for `document.fonts.status` and pending `delayRender` handles
   - `page.screenshot({ clip: ..., type: 'png' })`
6. Pipe frames into FFmpeg (`ffmpeg-static`) for H.264 encode (`libx264 -pix_fmt yuv420p -crf 18`).

## Repo layout

```
packages/
  core/         Vue primitives — useCurrentFrame, useVideoConfig,
                defineComposition, Sequence, delayRender/continueRender
  preview/      Browser UI — VumoPreview scrubber + vumoMount router
                + render harness
  renderer/     Node — Vite + Puppeteer + FFmpeg pipeline
  cli/          `vumo render` command
examples/
  hello-world/      Single composition, rotating pulsing square
  sequences-demo/   Three Sequence clips + delayRender
  audio-demo/       Background tone + four staggered SFX beeps
```

## Roadmap

- [x] **Phase 1** — Vue primitives + scrubber preview
- [x] **Phase 2** — Puppeteer + FFmpeg → MP4
- [x] **Phase 3** — `<Sequence>`, `delayRender`, worker pool
- [x] **Phase 4** — `<Audio>` + audio mux
- [x] **Phase 5** — Docs, Vitest suite, GitHub Actions CI, Changesets

### Up for `0.2.0`

- Production-bundle render path (skip Vite dev server → real worker-count scaling)
- `<Video>` for embedded clips
- Sequence-aware `<Audio>` (auto-shift `from` by parent Sequence offset)
- `interpolate` / `spring` animation helpers

## Acknowledgements

Heavily inspired by [Remotion](https://www.remotion.dev/) — the React framework that pioneered "videos as code." vumo aims to bring the same model to Vue 3.

## License

[MIT](./LICENSE).
