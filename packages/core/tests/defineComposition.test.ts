import { describe, it, expect, beforeEach } from 'vitest';
import { defineComposition, getComposition, listCompositions, clearCompositions } from '../src/index';
import { defineComponent } from 'vue';

const Dummy = defineComponent({ render: () => null });

describe('defineComposition', () => {
  beforeEach(() => clearCompositions());

  it('registers a composition retrievable by id', () => {
    defineComposition({
      id: 'demo',
      component: Dummy,
      width: 1280,
      height: 720,
      fps: 30,
      durationInFrames: 60,
    });
    expect(getComposition('demo')?.id).toBe('demo');
  });

  it('throws on duplicate ids', () => {
    defineComposition({
      id: 'dup',
      component: Dummy,
      width: 100,
      height: 100,
      fps: 30,
      durationInFrames: 10,
    });
    expect(() =>
      defineComposition({
        id: 'dup',
        component: Dummy,
        width: 100,
        height: 100,
        fps: 30,
        durationInFrames: 10,
      }),
    ).toThrow(/already registered/);
  });

  it('listCompositions returns all registrations in insertion order', () => {
    defineComposition({ id: 'a', component: Dummy, width: 100, height: 100, fps: 30, durationInFrames: 10 });
    defineComposition({ id: 'b', component: Dummy, width: 100, height: 100, fps: 30, durationInFrames: 10 });
    expect(listCompositions().map((c) => c.id)).toEqual(['a', 'b']);
  });
});
