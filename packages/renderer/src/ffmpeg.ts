import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildFfmpegArgs, type MuxOptions } from './audio.js';

const require = createRequire(import.meta.url);

export function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const resolved = require('ffmpeg-static') as string | null;
  if (!resolved) {
    throw new Error(
      '[vumo] ffmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.',
    );
  }
  return resolved;
}

export function encode(opts: MuxOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = resolveFfmpegPath();
    const args = buildFfmpegArgs(opts);
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
