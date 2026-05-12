# Primitives

vumo's core API is three Vue composables and one registration helper. Everything else (`Sequence`, `Audio`, `delayRender`) builds on these.

## `useCurrentFrame()`

Returns a read-only `Ref<number>` holding the current frame. Reads inside a `computed` or `<template>` are reactive — Vue re-renders that scope whenever the frame changes.

```ts
import { useCurrentFrame } from '@vumo/core';

const frame = useCurrentFrame();
```

Inside a `<Sequence>` (see [Sequences](./sequences)), this returns the **local** frame relative to that sequence's `from`, not the global timeline frame.

## `useVideoConfig()`

Returns the composition's metadata. The values are static for the lifetime of the composition — width/height/fps/durationInFrames don't change at runtime.

```ts
import { useVideoConfig } from '@vumo/core';

const { width, height, fps, durationInFrames } = useVideoConfig();
```

## `defineComposition()`

Registers a Vue component as a renderable composition. Call this at module load time (typically from `src/compositions.ts`).

```ts
import { defineComposition } from '@vumo/core';
import MyClip from './MyClip.vue';

defineComposition({
  id: 'my-clip',
  component: MyClip,
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 90,
  props: { title: 'Hello' }, // optional — passed to the component
});
```

The `id` is what you pass to `vumo render <id>`. IDs must be unique.

## Mounting

Your application entry calls `vumoMount` once. It reads the URL to decide whether to mount the scrubber preview or the headless render harness:

```ts
import { vumoMount } from '@vumo/preview';
import './compositions';

vumoMount('#app');
```

- `?vumoRender=1` — render mode. The harness exposes `window.__vumoSelectComposition`, `__vumoSetFrame`, `__vumoReadyForCapture` for the Node renderer to drive.
- otherwise — preview mode. Mounts `<VumoPreview>` around the first registered composition with a scrubber, play/pause, and keyboard shortcuts.

You can also use `<VumoPreview>` directly if you want to embed a preview in a larger Vue app.
