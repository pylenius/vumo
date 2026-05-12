import { inject } from 'vue';
import { VideoConfigKey, type VideoConfig } from './internals/index.js';

export function useVideoConfig(): VideoConfig {
  const config = inject(VideoConfigKey);
  if (!config) {
    throw new Error(
      '[vumo] useVideoConfig() must be called inside a <VumoPreview> or a rendering host.',
    );
  }
  return config;
}
