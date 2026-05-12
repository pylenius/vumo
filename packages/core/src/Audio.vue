<script setup lang="ts">
import { onMounted } from 'vue';
import { registerAudioCue } from './internals/audioRegistry.js';

const props = withDefaults(
  defineProps<{
    src: string;
    from: number;
    durationInFrames: number;
    volume?: number;
    loop?: boolean;
    startOffset?: number;
  }>(),
  { volume: 1, loop: false, startOffset: 0 },
);

onMounted(() => {
  registerAudioCue({
    src: props.src,
    from: props.from,
    durationInFrames: props.durationInFrames,
    volume: props.volume,
    loop: props.loop,
    startOffset: props.startOffset,
  });
});
</script>

<template></template>
