import { inject, type Ref } from 'vue';
import { FrameKey } from './internals/index.js';

export function useCurrentFrame(): Readonly<Ref<number>> {
  const frame = inject(FrameKey);
  if (!frame) {
    throw new Error(
      '[vumo] useCurrentFrame() must be called inside a <VumoPreview> or a rendering host.',
    );
  }
  return frame;
}
