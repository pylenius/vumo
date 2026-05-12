import { createApp, h } from 'vue';
import { VumoPreview } from '@vumo/preview';
import MyComposition from './MyComposition.vue';

createApp({
  render: () =>
    h(VumoPreview, {
      component: MyComposition,
      fps: 30,
      durationInFrames: 150,
      width: 1280,
      height: 720,
    }),
}).mount('#app');
