import { describe, it, expect, beforeEach } from 'vitest';
import {
  delayRender,
  continueRender,
  getPendingRenderHandles,
  clearPendingRenderHandles,
} from '../src/index';

describe('delayRender / continueRender', () => {
  beforeEach(() => clearPendingRenderHandles());

  it('returns a unique handle and records the label', () => {
    const a = delayRender('a');
    const b = delayRender('b');
    expect(a).not.toBe(b);
    const pending = getPendingRenderHandles();
    expect(pending).toHaveLength(2);
    expect(pending.map((h) => h.label).sort()).toEqual(['a', 'b']);
  });

  it('continueRender removes a single handle', () => {
    const a = delayRender('a');
    delayRender('b');
    continueRender(a);
    expect(getPendingRenderHandles().map((h) => h.label)).toEqual(['b']);
  });

  it('default label is "unnamed"', () => {
    delayRender();
    expect(getPendingRenderHandles()[0]!.label).toBe('unnamed');
  });

  it('clearPendingRenderHandles wipes everything', () => {
    delayRender('a');
    delayRender('b');
    clearPendingRenderHandles();
    expect(getPendingRenderHandles()).toEqual([]);
  });
});
