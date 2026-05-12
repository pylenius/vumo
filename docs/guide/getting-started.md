# Getting started

> vumo isn't on npm yet. While we're pre-`0.1.0`, install from git or work inside the monorepo. The instructions below describe the workflow as it will look once published.

## Install

```bash
npm install @vumo/core @vumo/preview vue
npm install -D @vumo/cli vite @vitejs/plugin-vue
```

## Project skeleton

```
my-video/
├── src/
│   ├── main.ts            # entry — calls vumoMount('#app')
│   ├── compositions.ts    # defineComposition() registrations
│   └── MyComposition.vue  # the actual video
├── public/                # static assets (audio, images)
├── index.html
├── vite.config.ts
└── package.json
```

### `src/MyComposition.vue`

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
    <div
      :style="{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '200px',
        height: '200px',
        background: '#e94560',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }"
    />
  </div>
</template>
```

### `src/compositions.ts`

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

### `src/main.ts`

```ts
import { vumoMount } from '@vumo/preview';
import './compositions';

vumoMount('#app');
```

That's the whole user-facing setup. `vumoMount` decides at runtime whether to show the scrubber preview or activate the headless render harness, based on the URL.

## Preview

```bash
npm run dev
```

Open the dev server URL. Drag the scrubber, press space to play, use ←/→ to step single frames.

## Render

```bash
npx vumo render my-video --output out.mp4
```

This boots a Vite dev server, launches headless Chrome, captures every frame, and pipes the result through FFmpeg.

## Where to next

- [Primitives](./primitives) — `useCurrentFrame`, `useVideoConfig`, `defineComposition`
- [Sequences](./sequences) — composing multiple clips with time-shifted children
- [Audio](./audio) — declarative audio cues
- [Rendering](./rendering) — what happens inside `vumo render`
