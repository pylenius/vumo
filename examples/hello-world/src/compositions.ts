import { defineComposition } from '@vumo/core';
import MyComposition from './MyComposition.vue';

defineComposition({
  id: 'hello-world',
  component: MyComposition,
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 150,
});
