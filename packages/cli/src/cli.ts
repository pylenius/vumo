#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { render } from '@vumo/renderer';

const program = new Command();

program
  .name('vumo')
  .description('Make videos programmatically with Vue 3')
  .version('0.0.1');

program
  .command('render')
  .description('Render a composition to an MP4 file')
  .argument('<compositionId>', 'ID of the registered composition to render')
  .option('-p, --project <path>', 'Path to project root (containing package.json)', process.cwd())
  .option('-o, --output <path>', 'Output MP4 file path', 'out.mp4')
  .option('--crf <number>', 'H.264 CRF — quality, lower is better (0-51)', '18')
  .action(async (compositionId: string, options: { project: string; output: string; crf: string }) => {
    const projectRoot = resolve(options.project);
    const output = resolve(options.output);
    const crf = Number(options.crf);

    if (Number.isNaN(crf) || crf < 0 || crf > 51) {
      console.error(`[vumo] Invalid --crf "${options.crf}" — must be a number between 0 and 51.`);
      process.exit(1);
    }

    console.log(`[vumo] rendering "${compositionId}"`);
    console.log(`[vumo]   project: ${projectRoot}`);
    console.log(`[vumo]   output:  ${output}`);

    const startedAt = Date.now();
    let lastLine = '';

    try {
      await render({
        projectRoot,
        compositionId,
        output,
        crf,
        onProgress: ({ frame, total, stage }) => {
          if (stage === 'capture') {
            const pct = ((frame / total) * 100).toFixed(1);
            lastLine = `[vumo] capture ${frame}/${total} (${pct}%)`;
            process.stdout.write(`\r${lastLine}`);
          } else if (stage === 'encode') {
            if (lastLine) process.stdout.write('\n');
            process.stdout.write('[vumo] encoding video…\n');
            lastLine = '';
          }
        },
      });

      if (lastLine) process.stdout.write('\n');
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[vumo] done in ${elapsed}s → ${output}`);
    } catch (err) {
      if (lastLine) process.stdout.write('\n');
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[vumo] render failed: ${message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
