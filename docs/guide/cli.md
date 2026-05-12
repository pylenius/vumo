# CLI reference

```
vumo render <compositionId> [options]
```

| Option              | Default            | Description                                       |
| ------------------- | ------------------ | ------------------------------------------------- |
| `-p, --project <p>` | `process.cwd()`    | Project root (containing `package.json`).         |
| `-o, --output <p>`  | `out.mp4`          | Output file path.                                 |
| `--crf <n>`         | `18`               | H.264 CRF, lower = better quality (range 0–51).   |
| `--workers <n>`     | `min(cpu, 4)`      | Parallel render workers (1–32).                   |

## Examples

```bash
vumo render my-clip
vumo render my-clip --output dist/preview.mp4 --crf 23
vumo render my-clip --workers 1            # serial, deterministic timing
vumo render my-clip --project ./my-video   # run from outside the project
```

## Environment variables

- `FFMPEG_PATH` — override the bundled `ffmpeg-static` binary (useful for CI runners with system FFmpeg).

## Exit codes

- `0` — success, MP4 written
- `1` — render failed (composition not found, ffmpeg error, etc.)
