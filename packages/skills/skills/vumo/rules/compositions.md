# Compositions

Compositions are the renderable units of a vumo project. Each composition is a Vue component plus metadata (id, dimensions, fps, duration). The CLI renders a composition by id.

## Registering

Call `defineComposition()` at module load time — typically from `src/compositions.ts`, which is then imported (for the side-effect) by `src/main.ts`.

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

**IDs must be unique** across a project. A duplicate `defineComposition` call throws.

## Mounting

A vumo entry point is a single line:

```ts
import { vumoMount } from '@vumo/preview';
import './compositions';

vumoMount('#app');
```

`vumoMount` checks the URL:

- **Preview mode** (default): mounts the scrubber UI around the first registered composition (or the one named in `?composition=<id>`).
- **Render mode** (`?vumoRender=1`): mounts the headless harness instead. Exposes `window.__vumoSelectComposition`, `__vumoSetFrame`, `__vumoReadyForCapture`, `__vumoListAudioCues` for the Node renderer to drive.

You don't need to handle this branching yourself — `vumoMount` does it.

## Reading composition metadata inside a component

```ts
import { useVideoConfig } from '@vumo/core';

const { width, height, fps, durationInFrames } = useVideoConfig();
```

`useVideoConfig()` returns the **outer composition's** dimensions and timing — it does not reflect anything about an enclosing `<Sequence>`.

## Multiple compositions

Register as many as you like. The CLI renders one at a time:

```bash
vumo render intro --output intro.mp4
vumo render outro --output outro.mp4
```

In preview mode, the scrubber shows the first composition. To preview a specific one, append `?composition=<id>` to the URL.

## Embedding `<VumoPreview>` in a larger app

If you want a preview embedded in a regular Vue app (not the standalone vumo entry), import `<VumoPreview>` directly:

```vue
<script setup lang="ts">
import { VumoPreview } from '@vumo/preview';
import MyClip from './MyClip.vue';
</script>

<template>
  <VumoPreview
    :component="MyClip"
    :width="1280"
    :height="720"
    :fps="30"
    :duration-in-frames="90"
  />
</template>
```

This skips the registry — the render harness won't see this composition. Use the registry path if you want the same component renderable via `vumo render`.
