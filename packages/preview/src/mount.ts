import { createApp, h } from 'vue';
import { listCompositions, getComposition } from '@vumo/core';
import VumoPreview from './VumoPreview.vue';
import { setupRenderHarness } from './renderHarness';

export function vumoMount(selector: string): void {
  const params = new URLSearchParams(window.location.search);

  if (params.get('vumoRender') === '1') {
    setupRenderHarness(selector);
    return;
  }

  const compositions = listCompositions();
  if (compositions.length === 0) {
    throw new Error(
      '[vumo] No compositions registered. Call defineComposition() before vumoMount().',
    );
  }

  const requestedId = params.get('composition');
  const comp = requestedId
    ? getComposition(requestedId)
    : compositions[0];
  if (!comp) {
    throw new Error(`[vumo] Composition "${requestedId}" not found.`);
  }

  createApp({
    render: () =>
      h(VumoPreview, {
        component: comp.component,
        width: comp.width,
        height: comp.height,
        fps: comp.fps,
        durationInFrames: comp.durationInFrames,
        componentProps: comp.props,
      }),
  }).mount(selector);
}
