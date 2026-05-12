import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { Sequence, useCurrentFrame } from '../src/index';
import { FrameKey, VideoConfigKey } from '../src/internals/index';

const FrameReadout = defineComponent({
  name: 'FrameReadout',
  setup() {
    const frame = useCurrentFrame();
    return () => h('span', { class: 'local-frame' }, String(frame.value));
  },
});

function makeHost(globalFrame: { value: number }) {
  return defineComponent({
    name: 'Host',
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
    provide() {
      return {
        [FrameKey as symbol]: globalFrame,
        [VideoConfigKey as symbol]: { width: 100, height: 100, fps: 30, durationInFrames: 100 },
      };
    },
  });
}

describe('<Sequence>', () => {
  it('shifts useCurrentFrame for descendants by `from`', async () => {
    const globalFrame = ref(75);
    const Host = makeHost(globalFrame);

    const wrapper = mount(Host, {
      slots: {
        default: () =>
          h(Sequence, { from: 60, durationInFrames: 30 }, { default: () => h(FrameReadout) }),
      },
    });

    await nextTick();
    expect(wrapper.find('.local-frame').text()).toBe('15');
  });

  it('hides children before `from` and after `from + duration`', async () => {
    const globalFrame = ref(10);
    const Host = makeHost(globalFrame);

    const wrapper = mount(Host, {
      slots: {
        default: () =>
          h(Sequence, { from: 60, durationInFrames: 30 }, { default: () => h(FrameReadout) }),
      },
    });

    await nextTick();
    expect(wrapper.find('.local-frame').exists()).toBe(false);

    globalFrame.value = 60;
    await nextTick();
    expect(wrapper.find('.local-frame').text()).toBe('0');

    globalFrame.value = 90;
    await nextTick();
    expect(wrapper.find('.local-frame').exists()).toBe(false);
  });
});
