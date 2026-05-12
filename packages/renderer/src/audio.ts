import { copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export interface AudioCue {
  id: number;
  src: string;
  from: number;
  durationInFrames: number;
  volume: number;
  loop: boolean;
  startOffset: number;
}

export function resolveAudioUrl(src: string, serverBaseUrl: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith('file://') || src.startsWith('data:')) {
    return src;
  }
  return new URL(src, serverBaseUrl).toString();
}

export async function downloadAudio(url: string, destPath: string): Promise<void> {
  if (url.startsWith('file://')) {
    await copyFile(fileURLToPath(url), destPath);
    return;
  }
  if (url.startsWith('data:')) {
    const [, payload] = url.split(',', 2);
    const buf = Buffer.from(payload!, 'base64');
    await writeFile(destPath, buf);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[vumo] Failed to fetch audio "${url}" → HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

export interface PreparedCue {
  cue: AudioCue;
  file: string;
}

function dedupeCues(cues: AudioCue[]): AudioCue[] {
  const seen = new Map<string, AudioCue>();
  for (const c of cues) {
    const key = `${c.src}|${c.from}|${c.durationInFrames}|${c.volume}|${c.loop}|${c.startOffset}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

export function mergeCuesFromWorkers(perWorker: ReadonlyArray<readonly AudioCue[]>): AudioCue[] {
  const flat = perWorker.flat();
  return dedupeCues(flat);
}

export interface MuxOptions {
  framesDir: string;
  framesPattern: string;
  fps: number;
  videoCrf: number;
  audioCues: ReadonlyArray<PreparedCue>;
  output: string;
}

export function buildFfmpegArgs(opts: MuxOptions): string[] {
  const args: string[] = ['-y'];

  args.push('-framerate', String(opts.fps));
  args.push('-i', `${opts.framesDir}/${opts.framesPattern}`);

  for (const { cue, file } of opts.audioCues) {
    if (cue.loop) {
      args.push('-stream_loop', '-1');
    }
    if (cue.startOffset > 0) {
      args.push('-ss', (cue.startOffset / opts.fps).toFixed(6));
    }
    args.push('-i', file);
  }

  if (opts.audioCues.length > 0) {
    const chains: string[] = [];
    const labels: string[] = [];

    opts.audioCues.forEach(({ cue }, i) => {
      const inputIdx = i + 1;
      const durSec = cue.durationInFrames / opts.fps;
      const fromMs = Math.round((cue.from / opts.fps) * 1000);
      const label = `a${i}`;
      // atrim limits playback duration; asetpts resets PTS so adelay starts from 0.
      // adelay shifts the audio start by `fromMs` in the output mix timeline.
      const filters: string[] = [];
      filters.push(`atrim=0:${durSec.toFixed(6)}`);
      filters.push(`asetpts=PTS-STARTPTS`);
      filters.push(`volume=${cue.volume.toFixed(4)}`);
      if (fromMs > 0) {
        // adelay needs one value per channel; "all=1" applies to all channels.
        filters.push(`adelay=delays=${fromMs}:all=1`);
      }
      chains.push(`[${inputIdx}:a]${filters.join(',')}[${label}]`);
      labels.push(`[${label}]`);
    });

    if (opts.audioCues.length === 1) {
      chains.push(`${labels[0]}aresample=async=1:first_pts=0[aout]`);
    } else {
      chains.push(
        `${labels.join('')}amix=inputs=${opts.audioCues.length}:duration=longest:normalize=0,` +
          `aresample=async=1:first_pts=0[aout]`,
      );
    }

    args.push('-filter_complex', chains.join('; '));
    args.push('-map', '0:v', '-map', '[aout]');
    args.push('-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-map', '0:v');
  }

  args.push('-c:v', 'libx264');
  args.push('-pix_fmt', 'yuv420p');
  args.push('-crf', String(opts.videoCrf));
  args.push('-preset', 'medium');
  args.push('-movflags', '+faststart');
  args.push('-shortest');
  args.push(opts.output);

  return args;
}
