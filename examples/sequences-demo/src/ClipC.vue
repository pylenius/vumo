<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCurrentFrame, delayRender, continueRender } from '@vumo/core';

const frame = useCurrentFrame();
const radius = computed(() => 60 + 30 * Math.sin(frame.value / 4));
const opacity = computed(() => {
  const fadeOut = Math.max(0, 1 - frame.value / 60);
  return fadeOut;
});

// Demonstrate delayRender: simulate a 100ms async setup before the clip is allowed to render.
onMounted(() => {
  const handle = delayRender('ClipC simulated async setup');
  setTimeout(() => continueRender(handle), 100);
});
</script>

<template>
  <div class="clip-c">
    <svg
      class="pulse"
      :width="320"
      :height="320"
      viewBox="-160 -160 320 320"
    >
      <circle :r="radius" fill="#06d6a0" :opacity="0.85 * opacity" />
      <circle :r="radius + 24" fill="none" stroke="#06d6a0" stroke-width="2" :opacity="0.4 * opacity" />
      <circle :r="radius + 48" fill="none" stroke="#06d6a0" stroke-width="1" :opacity="0.2 * opacity" />
    </svg>
    <div class="caption" :style="{ opacity }">
      Sequence C · delayRender() simulates async asset load
    </div>
  </div>
</template>

<style scoped>
.clip-c {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.caption {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  color: #fff;
  opacity: 0.6;
}
</style>
