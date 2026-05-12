import { createApp, h, ref, type App } from 'vue';
import { FrameKey, VideoConfigKey } from '@vumo/core/internals';
import {
  listCompositions,
  getComposition,
  getPendingRenderHandles,
  type CompositionDefinition,
} from '@vumo/core';

export interface CompositionInfo {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

declare global {
  interface Window {
    __vumoListCompositions?: () => CompositionInfo[];
    __vumoSelectComposition?: (id: string) => void;
    __vumoSetFrame?: (n: number) => void;
    __vumoReadyForCapture?: () => boolean;
    __vumoPendingHandles?: () => string[];
  }
}

export function setupRenderHarness(selector: string): void {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) {
    throw new Error(`[vumo] Mount target "${selector}" not found.`);
  }

  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#000';

  Object.assign(root.style, {
    margin: '0',
    padding: '0',
    overflow: 'hidden',
    position: 'fixed',
    top: '0',
    left: '0',
  });

  const frame = ref(0);
  let app: App | null = null;
  let currentComp: CompositionDefinition | null = null;

  window.__vumoListCompositions = (): CompositionInfo[] =>
    listCompositions().map((c) => ({
      id: c.id,
      width: c.width,
      height: c.height,
      fps: c.fps,
      durationInFrames: c.durationInFrames,
    }));

  window.__vumoSelectComposition = (id: string): void => {
    if (app) {
      app.unmount();
      app = null;
    }
    const comp = getComposition(id);
    if (!comp) {
      throw new Error(`[vumo] Composition "${id}" is not registered.`);
    }
    currentComp = comp;
    root.style.width = `${comp.width}px`;
    root.style.height = `${comp.height}px`;
    frame.value = 0;

    const componentProps = comp.props ?? {};
    app = createApp({
      render: () => h(comp.component, componentProps),
    });
    app.provide(FrameKey, frame);
    app.provide(VideoConfigKey, {
      width: comp.width,
      height: comp.height,
      fps: comp.fps,
      durationInFrames: comp.durationInFrames,
    });
    app.mount(root);
  };

  window.__vumoSetFrame = (n: number): void => {
    if (!currentComp) return;
    const clamped = Math.max(0, Math.min(currentComp.durationInFrames - 1, n | 0));
    frame.value = clamped;
  };

  window.__vumoReadyForCapture = (): boolean => {
    if (document.fonts.status === 'loading') return false;
    if (getPendingRenderHandles().length > 0) return false;
    return true;
  };

  window.__vumoPendingHandles = (): string[] =>
    getPendingRenderHandles().map((h) => h.label);
}
