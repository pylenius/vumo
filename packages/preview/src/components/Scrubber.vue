<script setup lang="ts">
defineProps<{
  frame: number;
  durationInFrames: number;
}>();
const emit = defineEmits<{ seek: [number] }>();

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('seek', Number(target.value));
}
</script>

<template>
  <div class="scrubber">
    <input
      type="range"
      :min="0"
      :max="durationInFrames - 1"
      :value="frame"
      @input="onInput"
    />
    <div class="frame-label">{{ frame }} / {{ durationInFrames - 1 }}</div>
  </div>
</template>

<style scoped>
.scrubber {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
input[type="range"] {
  flex: 1;
  accent-color: #e94560;
}
.frame-label {
  font-size: 12px;
  color: #888;
  min-width: 80px;
  text-align: right;
}
</style>
