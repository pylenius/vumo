<script setup lang="ts">
import { computed } from 'vue';
import { Audio, useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();
const { width, height, fps, durationInFrames } = useVideoConfig();

// Beep frames (must match the <Audio> :from props below)
const BEEPS = [
  { frame: 30, kind: 'A' as const },
  { frame: 90, kind: 'B' as const },
  { frame: 120, kind: 'A' as const },
  { frame: 150, kind: 'B' as const },
];
const BEEP_DURATION = 6; // frames the visual flash lasts

const activeBeep = computed(() => {
  for (const b of BEEPS) {
    if (frame.value >= b.frame && frame.value < b.frame + BEEP_DURATION) return b;
  }
  return null;
});

const flashIntensity = computed(() => {
  const b = activeBeep.value;
  if (!b) return 0;
  const t = (frame.value - b.frame) / BEEP_DURATION;
  return 1 - t;
});

const breath = computed(() => 1 + 0.08 * Math.sin((frame.value / fps) * Math.PI * 2 * 0.5));
const circleScale = computed(() => breath.value + flashIntensity.value * 0.6);
const circleColor = computed(() => {
  if (!activeBeep.value) return '#3a7bd5';
  return activeBeep.value.kind === 'A' ? '#ffd166' : '#ef476f';
});

const progress = computed(() => frame.value / (durationInFrames - 1));
</script>

<template>
  <Audio src="/bg.wav"     :from="0"   :duration-in-frames="180" :volume="0.4" />
  <Audio src="/beep-a.wav" :from="30"  :duration-in-frames="6"   :volume="0.9" />
  <Audio src="/beep-b.wav" :from="90"  :duration-in-frames="6"   :volume="0.9" />
  <Audio src="/beep-a.wav" :from="120" :duration-in-frames="6"   :volume="0.9" />
  <Audio src="/beep-b.wav" :from="150" :duration-in-frames="6"   :volume="0.9" />

  <div class="stage" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      class="circle"
      :style="{
        transform: `translate(-50%, -50%) scale(${circleScale})`,
        background: circleColor,
        boxShadow: `0 0 ${80 + flashIntensity * 200}px ${circleColor}`,
      }"
    />

    <div class="hud-top">vumo · audio-demo</div>
    <div class="hud-bottom">
      <span>frame {{ frame }} / {{ durationInFrames - 1 }}</span>
      <span v-if="activeBeep">beep {{ activeBeep.kind }} ♪</span>
      <span v-else>—</span>
      <span>{{ Math.round(progress * 100) }}%</span>
    </div>

    <div class="timeline">
      <div
        v-for="b in BEEPS"
        :key="`${b.frame}-${b.kind}`"
        class="marker"
        :class="{ active: activeBeep?.frame === b.frame }"
        :style="{ left: `${(b.frame / (durationInFrames - 1)) * 100}%` }"
      />
      <div class="playhead" :style="{ left: `${progress * 100}%` }" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  background: radial-gradient(ellipse at center, #14142b 0%, #0d0d12 80%);
  overflow: hidden;
  color: #e6e6e6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.circle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
}
.hud-top {
  position: absolute;
  top: 24px;
  left: 24px;
  font-size: 14px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.5;
}
.hud-bottom {
  position: absolute;
  bottom: 56px;
  left: 24px;
  right: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  opacity: 0.7;
}
.timeline {
  position: absolute;
  bottom: 20px;
  left: 24px;
  right: 24px;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}
.marker {
  position: absolute;
  top: -6px;
  width: 4px;
  height: 16px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  transform: translateX(-2px);
  transition: none;
}
.marker.active {
  background: #ffd166;
  height: 22px;
  top: -9px;
  box-shadow: 0 0 12px #ffd166;
}
.playhead {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 10px;
  background: #fff;
  transform: translateX(-1px);
}
</style>
