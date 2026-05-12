import { describe, it, expect } from 'vitest';
import {
  buildFfmpegArgs,
  resolveAudioUrl,
  mergeCuesFromWorkers,
  type AudioCue,
} from '../src/audio';

function cue(overrides: Partial<AudioCue> = {}): AudioCue {
  return {
    id: 0,
    src: '/bg.wav',
    from: 0,
    durationInFrames: 30,
    volume: 1,
    loop: false,
    startOffset: 0,
    ...overrides,
  };
}

describe('resolveAudioUrl', () => {
  it('passes through absolute http(s) URLs', () => {
    expect(resolveAudioUrl('https://example.com/a.wav', 'http://localhost:5173/')).toBe(
      'https://example.com/a.wav',
    );
  });

  it('resolves relative paths against the dev server origin', () => {
    expect(resolveAudioUrl('/bg.wav', 'http://localhost:5173/')).toBe(
      'http://localhost:5173/bg.wav',
    );
  });

  it('passes through data: and file: URLs unchanged', () => {
    expect(resolveAudioUrl('data:audio/wav;base64,AAAA', 'http://x/')).toMatch(/^data:/);
    expect(resolveAudioUrl('file:///x.wav', 'http://x/')).toBe('file:///x.wav');
  });
});

describe('mergeCuesFromWorkers', () => {
  it('deduplicates cues with identical parameters across workers', () => {
    const merged = mergeCuesFromWorkers([
      [cue({ id: 1 })],
      [cue({ id: 2 })],
    ]);
    expect(merged).toHaveLength(1);
  });

  it('keeps cues that differ in any audio parameter', () => {
    const merged = mergeCuesFromWorkers([
      [cue({ id: 1, from: 0 })],
      [cue({ id: 2, from: 30 })],
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('buildFfmpegArgs', () => {
  const baseOpts = {
    framesDir: '/tmp/frames',
    framesPattern: 'frame-%06d.png',
    fps: 30,
    videoCrf: 18,
    output: '/tmp/out.mp4',
  };

  it('omits all audio handling when no cues', () => {
    const args = buildFfmpegArgs({ ...baseOpts, audioCues: [] });
    expect(args).toContain('-map');
    expect(args).toContain('0:v');
    expect(args).not.toContain('-filter_complex');
  });

  it('builds filter_complex with adelay for a cue starting after t=0', () => {
    const args = buildFfmpegArgs({
      ...baseOpts,
      audioCues: [{ cue: cue({ from: 30, durationInFrames: 6, volume: 0.5 }), file: '/tmp/c.wav' }],
    });
    const filter = args[args.indexOf('-filter_complex') + 1]!;
    expect(filter).toMatch(/atrim=0:0\.200000/);
    expect(filter).toMatch(/volume=0\.5000/);
    expect(filter).toMatch(/adelay=delays=1000:all=1/);
  });

  it('amix combines multiple cues', () => {
    const args = buildFfmpegArgs({
      ...baseOpts,
      audioCues: [
        { cue: cue({ id: 1 }), file: '/a.wav' },
        { cue: cue({ id: 2, from: 30 }), file: '/b.wav' },
      ],
    });
    const filter = args[args.indexOf('-filter_complex') + 1]!;
    expect(filter).toMatch(/amix=inputs=2/);
  });

  it('emits -stream_loop -1 only for looping cues', () => {
    const args = buildFfmpegArgs({
      ...baseOpts,
      audioCues: [{ cue: cue({ loop: true }), file: '/a.wav' }],
    });
    expect(args).toContain('-stream_loop');
  });
});
