import { defineComposition } from '@vumo/core';
import Root from './Root.vue';

defineComposition({
  id: 'audio-demo',
  component: Root,
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 180,
});
