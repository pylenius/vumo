import type { InjectionKey, Ref } from 'vue';

export interface VideoConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly durationInFrames: number;
}

export const FrameKey: InjectionKey<Ref<number>> = Symbol('vumo:frame');
export const VideoConfigKey: InjectionKey<VideoConfig> = Symbol('vumo:videoConfig');
