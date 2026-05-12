<script setup lang="ts">
import { computed } from 'vue';
import { useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();
const { width, height, fps, durationInFrames } = useVideoConfig();

const rotation = computed(() => frame.value * 4);
const scale = computed(() => 1 + 0.3 * Math.sin((frame.value / fps) * Math.PI));
const progress = computed(() => frame.value / (durationInFrames - 1));
</script>

<template>
  <div class="scene" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      class="square"
      :style="{
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
      }"
    />
    <div class="hud-top">vumo · hello-world</div>
    <div class="hud-bottom">
      <div>frame {{ frame }} / {{ durationInFrames - 1 }}</div>
      <div>{{ fps }} fps</div>
      <div>{{ Math.round(progress * 100) }}%</div>
    </div>
    <div class="progress" :style="{ width: `${progress * 100}%` }" />
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d12 70%);
  overflow: hidden;
  color: #e6e6e6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.square {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 240px;
  height: 240px;
  background: linear-gradient(135deg, #e94560 0%, #ff6b9d 100%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(233, 69, 96, 0.4);
}
.hud-top {
  position: absolute;
  top: 24px;
  left: 24px;
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
}
.hud-bottom {
  position: absolute;
  bottom: 32px;
  left: 24px;
  right: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 18px;
}
.progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #e94560;
  transition: none;
}
</style>
