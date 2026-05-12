---
name: vumo-best-practices
description: Best practices for vumo — programmatic video creation with Vue 3
metadata:
  tags: vumo, video, vue, vue3, composition-api, programmatic-video, remotion
---

## When to use

Use this skill whenever you are reading, writing, or debugging vumo code — Vue 3 components that read `useCurrentFrame()`, `<Sequence>` time-shifting, `<Audio>` cues, the `vumo render` CLI, or anything else under the `@vumo/*` packages.

vumo is a Vue-native port of Remotion. The model is the same: **a video is a function of frame number, rendered offline by a headless browser**. If you've used Remotion in React, the surface is mostly familiar — the differences are noted below.

## New project setup

If the user is in an empty folder or workspace with no existing vumo project, scaffold one manually (there's no `create-vumo` command yet):

```bash
mkdir my-video && cd my-video
pnpm init
pnpm add @vumo/core @vumo/preview vue
pnpm add -D @vumo/cli vite @vitejs/plugin-vue typescript vue-tsc
```

Create these files:

```
my-video/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts            # vumoMount('#app')
│   ├── compositions.ts    # defineComposition() calls
│   └── MyComposition.vue
└── public/                # static assets (audio, images)
```

`index.html`:

```html
<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /><title>my-video</title>
    <style>html,body,#app{margin:0;padding:0;height:100%;width:100%}</style>
  </head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue()] });
```

`src/main.ts`:

```ts
import { vumoMount } from '@vumo/preview';
import './compositions';

vumoMount('#app');
```

`src/compositions.ts`:

```ts
import { defineComposition } from '@vumo/core';
import MyComposition from './MyComposition.vue';

defineComposition({
  id: 'my-video',
  component: MyComposition,
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 150,
});
```

`src/MyComposition.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();
const { width, height } = useVideoConfig();
const rotation = computed(() => frame.value * 4);
</script>

<template>
  <div :style="{ width: `${width}px`, height: `${height}px`, background: '#0d0d12' }">
    <div :style="{
      position: 'absolute', left: '50%', top: '50%',
      width: '200px', height: '200px', background: '#e94560',
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }" />
  </div>
</template>
```

Preview: `pnpm exec vite`. Render: `pnpm exec vumo render my-video --output out.mp4`.

## Designing a video

`useCurrentFrame()` returns a **`Ref<number>`** — not a plain number like Remotion's React hook. Always read `frame.value` in `<script>` (the template auto-unwraps refs).

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const opacity = computed(() => Math.min(1, frame.value / (2 * fps)));
</script>

<template>
  <div :style="{ opacity }">Hello World!</div>
</template>
```

Compute derived animation values in `computed()` for reactivity and cleanliness. Reads in templates work too.

**vumo does not ship `interpolate()` or `spring()` helpers yet** (Remotion has them; planned for `0.2.x`). Do animation math by hand for now:

```ts
// Linear remap of frame range [a, b] → output range [from, to], clamped:
const t = Math.min(1, Math.max(0, (frame.value - a) / (b - a)));
const out = from + (to - from) * t;

// Eased (cubic-out):
const eased = 1 - Math.pow(1 - t, 3);
```

### Anti-patterns

**FORBIDDEN — CSS transitions and `@keyframes`** animations are driven by the browser's real-time clock. The renderer captures frames as fast as Puppeteer can drive them, so CSS animations either don't advance at all or land at random progress. Drive everything from `frame.value`.

**FORBIDDEN — Tailwind `animate-*` classes** for the same reason.

**FORBIDDEN — using `setTimeout`, `setInterval`, `Date.now()` for animation timing.** The determinism shim clamps `Date.now`/`performance.now` to frame time at render, but you should not rely on it: animations should be a pure function of `frame.value`.

**OK** — fetching, async setup, and waiting on assets: see [delay-render](./rules/delay-render.md).

## Static assets

Place files in `public/` at your project root. Reference them by absolute path:

```vue
<template>
  <img src="/logo.png" :style="{ width: '200px' }" />
</template>
```

For `<Audio>` cues (see below) the `src` is also a public path:

```vue
<Audio src="/bg.wav" :from="0" :duration-in-frames="180" :volume="0.4" />
```

The renderer resolves these against the Vite dev server's URL at render time.

## Sequencing

`<Sequence>` shifts the frame seen by its descendants and gates render to `[from, from + durationInFrames)`. See [rules/sequencing.md](./rules/sequencing.md) for the full mental model and nesting rules.

```vue
<template>
  <Sequence :from="0"   :duration-in-frames="60"><Intro /></Sequence>
  <Sequence :from="60"  :duration-in-frames="60"><Middle /></Sequence>
  <Sequence :from="120" :duration-in-frames="60"><Outro /></Sequence>
</template>
```

Inside each clip, `useCurrentFrame()` returns 0–59 — clips don't have to know where they sit on the global timeline.

## Audio

`<Audio>` declares an audio cue: source, global frame start, duration, optional volume/loop/startOffset. See [rules/audio.md](./rules/audio.md) for details and gotchas.

```vue
<Audio src="/bg.wav"     :from="0"   :duration-in-frames="180" :volume="0.4" />
<Audio src="/beep-a.wav" :from="30"  :duration-in-frames="6"   :volume="0.9" />
```

`<Audio>` renders nothing visible. The renderer collects cues from every worker page after capture and muxes them via FFmpeg.

**`from` is global, not sequence-relative.** If you put `<Audio>` inside a `<Sequence :from="60">`, the audio's `from` is still measured against the composition's timeline — it does **not** inherit the sequence's shift. This is a deliberate v1 trade-off.

## Delaying render for async assets

Use `delayRender()` / `continueRender()` to make the renderer wait for fonts, images, or fetched data. See [rules/delay-render.md](./rules/delay-render.md).

```ts
import { onMounted } from 'vue';
import { delayRender, continueRender } from '@vumo/core';

onMounted(async () => {
  const handle = delayRender('load profile data');
  await fetch('/api/profile');
  continueRender(handle);
});
```

A handle that's never continued hangs the render for 30 seconds, then throws.

## Rendering

```bash
vumo render <compositionId> [options]
  -p, --project <path>    project root (default: cwd)
  -o, --output <path>     output MP4 (default: out.mp4)
  --crf <0-51>            H.264 CRF, lower = better (default: 18)
  --workers <n>           parallel render workers (default: min(cpu, 4))
```

The renderer starts a Vite dev server in `--project`, launches headless Chromium, navigates each worker to `/?vumoRender=1`, captures frames, then muxes with FFmpeg. See [rules/rendering.md](./rules/rendering.md).

## Differences vs Remotion (if user is porting React code)

| Remotion                                | vumo                                                |
| --------------------------------------- | --------------------------------------------------- |
| `useCurrentFrame()` returns `number`    | returns `Ref<number>` — use `.value` in `<script>`  |
| `<Composition>` JSX in `Root.tsx`       | `defineComposition({ ... })` imperative call        |
| `interpolate()`, `spring()` helpers     | not yet — do math manually with `Math.min/max/sin` |
| `<Audio>` sequence-relative `from`      | `<Audio>` global-frame `from`                       |
| `<Video>` for embedded clips            | not yet                                             |
| `staticFile()` for assets               | plain `/path.ext` referring to Vite `public/`       |
| `delayRender(label)` returns string id  | `delayRender(label)` returns number id              |

When porting, every `useCurrentFrame()` read becomes `frame.value`. Every `interpolate(...)` becomes a hand-rolled `Math.min(1, (frame.value - a) / (b - a))` pattern.

## Per-topic deep dives

- [rules/compositions.md](./rules/compositions.md) — `defineComposition`, mounting, the preview-vs-render harness
- [rules/sequencing.md](./rules/sequencing.md) — `<Sequence>` mental model, nesting, gotchas
- [rules/audio.md](./rules/audio.md) — `<Audio>` cues, FFmpeg mux, preview sync
- [rules/timing-and-animation.md](./rules/timing-and-animation.md) — hand-rolled interpolation, easing, spring approximations
- [rules/delay-render.md](./rules/delay-render.md) — async asset gating semantics
- [rules/determinism.md](./rules/determinism.md) — what the determinism shim does and doesn't cover
- [rules/rendering.md](./rules/rendering.md) — the render pipeline end-to-end, `--workers` perf notes, troubleshooting
