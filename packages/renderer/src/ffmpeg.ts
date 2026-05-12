import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const resolved = require('ffmpeg-static') as string | null;
  if (!resolved) {
    throw new Error(
      '[vumo] ffmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.',
    );
  }
  return resolved;
}

export interface EncodeOptions {
  framesDir: string;
  pattern: string;
  fps: number;
  output: string;
  crf: number;
}

export function encodeH264(opts: EncodeOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = resolveFfmpegPath();
    const args = [
      '-y',
      '-framerate',
      String(opts.fps),
      '-i',
      join(opts.framesDir, opts.pattern),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      String(opts.crf),
      '-preset',
      'medium',
      '-movflags',
      '+faststart',
      opts.output,
    ];
    const proc = spawn(ffmpeg, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
    });
  });
}
