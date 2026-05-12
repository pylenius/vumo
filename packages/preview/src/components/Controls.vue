<script setup lang="ts">
defineProps<{
  playing: boolean;
  frame: number;
  durationInFrames: number;
  fps: number;
}>();
const emit = defineEmits<{ togglePlay: []; step: [number] }>();
</script>

<template>
  <div class="controls">
    <button @click="emit('step', -10)" title="Back 10 frames (J)">«</button>
    <button @click="emit('step', -1)" title="Back 1 frame (←)">‹</button>
    <button class="play" @click="emit('togglePlay')" :title="playing ? 'Pause (Space)' : 'Play (Space)'">
      {{ playing ? '❚❚' : '▶' }}
    </button>
    <button @click="emit('step', 1)" title="Forward 1 frame (→)">›</button>
    <button @click="emit('step', 10)" title="Forward 10 frames (L)">»</button>
    <div class="meta">
      <span>{{ fps }} fps</span>
      <span>{{ (durationInFrames / fps).toFixed(2) }}s</span>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
button {
  background: #222;
  color: #eee;
  border: 1px solid #333;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  min-width: 36px;
}
button:hover {
  background: #2c2c34;
}
button.play {
  background: #e94560;
  border-color: #e94560;
  min-width: 44px;
}
button.play:hover {
  background: #f15a78;
}
.meta {
  margin-left: auto;
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}
</style>
