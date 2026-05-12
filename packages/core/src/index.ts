export { useCurrentFrame } from './useCurrentFrame.js';
export { useVideoConfig } from './useVideoConfig.js';
export {
  defineComposition,
  getComposition,
  listCompositions,
  clearCompositions,
  type CompositionDefinition,
} from './defineComposition.js';
export {
  delayRender,
  continueRender,
  getPendingRenderHandles,
  clearPendingRenderHandles,
  type DelayRenderHandle,
} from './delayRender.js';
export { default as Sequence } from './Sequence.vue';
export { default as Audio } from './Audio.vue';
export {
  registerAudioCue,
  listAudioCues,
  getAudioCuesRef,
  clearAudioCues,
  type AudioCue,
  type AudioCueInput,
} from './internals/audioRegistry.js';
export type { VideoConfig } from './internals/index.js';
