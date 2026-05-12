# Sequences

`<Sequence>` is a wrapper that **time-shifts** its descendants. Inside a sequence with `from=60`, `useCurrentFrame()` returns a frame that's `60` less than the global timeline. The sequence's children also only mount while the global frame is in `[from, from + durationInFrames)`.

```vue
<script setup lang="ts">
import { Sequence } from '@vumo/core';
import Intro from './Intro.vue';
import Middle from './Middle.vue';
import Outro from './Outro.vue';
</script>

<template>
  <Sequence :from="0"   :duration-in-frames="60"><Intro /></Sequence>
  <Sequence :from="60"  :duration-in-frames="60"><Middle /></Sequence>
  <Sequence :from="120" :duration-in-frames="60"><Outro /></Sequence>
</template>
```

`Intro`, `Middle`, and `Outro` each read `useCurrentFrame()` and see values from `0` to `59` — they don't have to know where they sit on the global timeline.

## Mental model

A `<Sequence>` is `v-if` plus a `provide()` that re-binds `FrameKey` to a shifted ref. Children mount when visible and unmount otherwise. Component-level state (`ref`, `onMounted`) resets on each mount.

## Composing sequences

You can nest sequences. The frame seen by the innermost child is global − sum-of-all-`from` values along the path.

## What `useVideoConfig()` returns inside a sequence

Sequences do **not** override video config — `useVideoConfig()` continues to return the outer composition's `width`/`height`/`fps`/`durationInFrames`. That's intentional: a clip's animations are usually a function of fps, and fps belongs to the composition, not the clip.
