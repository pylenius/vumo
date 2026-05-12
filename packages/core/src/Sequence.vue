<script setup lang="ts">
import { computed, inject, provide } from 'vue';
import { FrameKey } from './internals/index.js';

const props = withDefaults(
  defineProps<{
    from?: number;
    durationInFrames?: number;
  }>(),
  { from: 0, durationInFrames: Number.POSITIVE_INFINITY },
);

const parentFrame = inject(FrameKey);
if (!parentFrame) {
  throw new Error('[vumo] <Sequence> must be used inside a composition.');
}

const localFrame = computed(() => parentFrame.value - props.from);
const visible = computed(() => {
  const f = parentFrame.value;
  return f >= props.from && f < props.from + props.durationInFrames;
});

provide(FrameKey, localFrame);
</script>

<template>
  <template v-if="visible">
    <slot />
  </template>
</template>
