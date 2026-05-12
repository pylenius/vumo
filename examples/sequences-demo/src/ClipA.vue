<script setup lang="ts">
import { computed } from 'vue';
import { useCurrentFrame } from '@vumo/core';

const frame = useCurrentFrame();
const progress = computed(() => Math.min(1, frame.value / 30));
const xOffset = computed(() => (1 - progress.value) * -800);
const opacity = computed(() => progress.value);
</script>

<template>
  <div class="clip-a">
    <div
      class="title"
      :style="{ transform: `translateX(${xOffset}px)`, opacity }"
    >
      Sequence&nbsp;A
    </div>
    <div class="caption" :style="{ opacity }">slides in from the left</div>
  </div>
</template>

<style scoped>
.clip-a {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #fff;
}
.title {
  font-size: 120px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #ffd166 0%, #ef476f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.caption {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 16px;
  opacity: 0.6;
}
</style>
