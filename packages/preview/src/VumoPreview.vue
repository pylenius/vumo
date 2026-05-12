<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch, watchEffect, type Component } from 'vue';
import { FrameKey, VideoConfigKey } from '@vumo/core/internals';
import { getAudioCuesRef, type AudioCue } from '@vumo/core';
import Scrubber from './components/Scrubber.vue';
import Controls from './components/Controls.vue';

const props = defineProps<{
  component: Component;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  componentProps?: Record<string, unknown>;
}>();

const frame = ref(0);
const playing = ref(false);
const scale = ref(1);
const stageRef = ref<HTMLElement | null>(null);
let rafId: number | null = null;
let lastTickTime = 0;

provide(FrameKey, frame);
provide(VideoConfigKey, {
  get width() { return props.width; },
  get height() { return props.height; },
  get fps() { return props.fps; },
  get durationInFrames() { return props.durationInFrames; },
});

function updateScale() {
  const el = stageRef.value;
  const parent = el?.parentElement;
  if (!el || !parent) return;
  const sx = (parent.clientWidth - 32) / props.width;
  const sy = (parent.clientHeight - 32) / props.height;
  scale.value = Math.min(sx, sy, 1);
}

function tick(t: number) {
  if (!playing.value) return;
  if (!lastTickTime) lastTickTime = t;
  const frameDurMs = 1000 / props.fps;
  const advance = Math.floor((t - lastTickTime) / frameDurMs);
  if (advance > 0) {
    let next = frame.value + advance;
    if (next >= props.durationInFrames) next = next % props.durationInFrames;
    frame.value = next;
    lastTickTime += advance * frameDurMs;
  }
  rafId = requestAnimationFrame(tick);
}

function togglePlay() {
  playing.value = !playing.value;
  lastTickTime = 0;
  if (playing.value) {
    rafId = requestAnimationFrame(tick);
  } else if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function step(delta: number) {
  const next = Math.max(0, Math.min(props.durationInFrames - 1, frame.value + delta));
  frame.value = next;
}

function seek(n: number) {
  frame.value = Math.max(0, Math.min(props.durationInFrames - 1, n));
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowLeft') step(-1);
  else if (e.code === 'ArrowRight') step(1);
  else if (e.key === 'j' || e.key === 'J') step(-10);
  else if (e.key === 'l' || e.key === 'L') step(10);
  else if (e.key === 'k' || e.key === 'K') togglePlay();
}

// --- Audio playback for preview (best-effort sync) ---
const cuesRef = getAudioCuesRef();
const audioElements = new Map<number, HTMLAudioElement>();

function pauseAllAudio() {
  for (const el of audioElements.values()) {
    if (!el.paused) el.pause();
  }
}

function disposeAudio(id: number) {
  const el = audioElements.get(id);
  if (el) {
    el.pause();
    el.src = '';
    audioElements.delete(id);
  }
}

function ensureAudioElement(cue: AudioCue): HTMLAudioElement {
  let el = audioElements.get(cue.id);
  if (!el) {
    el = new Audio(cue.src);
    el.volume = cue.volume;
    el.loop = cue.loop;
    el.preload = 'auto';
    audioElements.set(cue.id, el);
  }
  return el;
}

function syncAudioForFrame(f: number, isPlaying: boolean) {
  for (const cue of cuesRef.value) {
    const el = ensureAudioElement(cue);
    const inWindow = f >= cue.from && f < cue.from + cue.durationInFrames;
    if (inWindow && isPlaying) {
      const targetTime = (f - cue.from + cue.startOffset) / props.fps;
      if (!cue.loop && Math.abs(el.currentTime - targetTime) > 0.12) {
        el.currentTime = targetTime;
      }
      if (el.paused) el.play().catch(() => undefined);
    } else if (!el.paused) {
      el.pause();
    }
  }
}

watch([frame, playing], ([f, isPlaying]) => syncAudioForFrame(f, isPlaying));

watch(cuesRef, (newCues, oldCues) => {
  const newIds = new Set(newCues.map((c) => c.id));
  for (const old of oldCues ?? []) {
    if (!newIds.has(old.id)) disposeAudio(old.id);
  }
  syncAudioForFrame(frame.value, playing.value);
});

onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', updateScale);
  updateScale();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', updateScale);
  if (rafId !== null) cancelAnimationFrame(rafId);
  pauseAllAudio();
  for (const id of Array.from(audioElements.keys())) disposeAudio(id);
});

watchEffect(() => {
  // re-run on size changes
  void props.width; void props.height;
  updateScale();
});
</script>

<template>
  <div class="vumo-app">
    <div class="vumo-stage-container">
      <div
        ref="stageRef"
        class="vumo-stage"
        :style="{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
        }"
      >
        <component :is="component" v-bind="componentProps ?? {}" />
      </div>
    </div>
    <div class="vumo-toolbar">
      <Controls
        :playing="playing"
        :frame="frame"
        :duration-in-frames="durationInFrames"
        :fps="fps"
        @toggle-play="togglePlay"
        @step="step"
      />
      <Scrubber
        :frame="frame"
        :duration-in-frames="durationInFrames"
        @seek="seek"
      />
    </div>
  </div>
</template>

<style scoped>
.vumo-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #0d0d12;
  color: #e6e6e6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
}
.vumo-stage-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
}
.vumo-stage {
  transform-origin: center center;
  background: #000;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.vumo-toolbar {
  border-top: 1px solid #222;
  padding: 12px 16px;
  background: #14141a;
}
</style>
