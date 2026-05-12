<script setup lang="ts">
import { computed } from 'vue';
import { Sequence, useCurrentFrame, useVideoConfig } from '@vumo/core';
import ClipA from './ClipA.vue';
import ClipB from './ClipB.vue';
import ClipC from './ClipC.vue';

const frame = useCurrentFrame();
const { width, height, durationInFrames } = useVideoConfig();

const activeClip = computed(() => {
  if (frame.value < 60) return 'A';
  if (frame.value < 120) return 'B';
  return 'C';
});
</script>

<template>
  <div class="stage" :style="{ width: `${width}px`, height: `${height}px` }">
    <Sequence :from="0" :duration-in-frames="60">
      <ClipA />
    </Sequence>
    <Sequence :from="60" :duration-in-frames="60">
      <ClipB />
    </Sequence>
    <Sequence :from="120" :duration-in-frames="60">
      <ClipC />
    </Sequence>

    <div class="overlay">
      <span>global frame {{ frame }} / {{ durationInFrames - 1 }}</span>
      <span>clip {{ activeClip }}</span>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d12 70%);
  overflow: hidden;
  color: #e6e6e6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.overlay {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.5;
  pointer-events: none;
}
</style>
