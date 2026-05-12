import { describe, it, expect, beforeEach } from 'vitest';
import { registerAudioCue, listAudioCues, clearAudioCues } from '../src/index';

describe('audioRegistry', () => {
  beforeEach(() => clearAudioCues());

  it('normalizes optional fields to defaults', () => {
    registerAudioCue({ src: '/a.wav', from: 0, durationInFrames: 60 });
    const [cue] = listAudioCues();
    expect(cue).toMatchObject({
      src: '/a.wav',
      from: 0,
      durationInFrames: 60,
      volume: 1,
      loop: false,
      startOffset: 0,
    });
  });

  it('deduplicates cues with identical parameters', () => {
    const a = registerAudioCue({ src: '/a.wav', from: 0, durationInFrames: 60, volume: 0.5 });
    const b = registerAudioCue({ src: '/a.wav', from: 0, durationInFrames: 60, volume: 0.5 });
    expect(a).toBe(b);
    expect(listAudioCues()).toHaveLength(1);
  });

  it('keeps cues that differ in any parameter', () => {
    registerAudioCue({ src: '/a.wav', from: 0, durationInFrames: 60 });
    registerAudioCue({ src: '/a.wav', from: 30, durationInFrames: 60 });
    expect(listAudioCues()).toHaveLength(2);
  });
});
