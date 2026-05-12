<script setup lang="ts">
import { computed } from 'vue';
import { useCurrentFrame } from '@vumo/core';

const frame = useCurrentFrame();

const squares = computed(() =>
  Array.from({ length: 5 }, (_, i) => ({
    rotation: frame.value * (6 + i * 2),
    x: (i - 2) * 160,
    scale: 0.6 + 0.2 * Math.sin((frame.value + i * 10) / 8),
    hue: 200 + i * 30,
  })),
);
</script>

<template>
  <div class="clip-b">
    <div
      v-for="(sq, i) in squares"
      :key="i"
      class="square"
      :style="{
        transform: `translate(${sq.x}px, 0) rotate(${sq.rotation}deg) scale(${sq.scale})`,
        background: `hsl(${sq.hue} 80% 55%)`,
      }"
    />
    <div class="caption">Sequence B · local frame increments inside &lt;Sequence&gt;</div>
  </div>
</template>

<style scoped>
.clip-b {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.square {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 18px;
  left: 50%;
  top: 50%;
  margin-left: -60px;
  margin-top: -60px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}
.caption {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 14px;
  opacity: 0.5;
  color: #fff;
}
</style>
