# Audio

`<Audio>` declares an audio cue: a source file, the global frame at which it should start playing, and how long it should play.

```vue
<script setup lang="ts">
import { Audio } from '@vumo/core';
</script>

<template>
  <Audio src="/bg.wav"     :from="0"   :duration-in-frames="180" :volume="0.4" />
  <Audio src="/beep-a.wav" :from="30"  :duration-in-frames="6"   :volume="0.9" />
  <Audio src="/beep-b.wav" :from="90"  :duration-in-frames="6"   :volume="0.9" />
</template>
```

`<Audio>` renders nothing visible. It registers a cue into a per-page registry on mount.

## Preview playback

The scrubber preview drives HTML5 `<audio>` elements that follow your frame timer with a 0.12 s drift tolerance. This is best-effort sync — useful for previewing rhythm, not for sample-accurate review.

## Render-time mixing

After the renderer finishes capturing every video frame, it queries each worker page for its registered cues, dedupes, and downloads the source files from the dev server. FFmpeg is then invoked with one input per cue:

```
ffmpeg
  -framerate 30 -i frame-%06d.png
  -i bg.wav -i beep-a.wav -i beep-b.wav
  -filter_complex
    "[1:a]atrim=0:6,asetpts=PTS-STARTPTS,volume=0.4000[a0];
     [2:a]atrim=0:0.2,asetpts=PTS-STARTPTS,volume=0.9000,adelay=delays=1000:all=1[a1];
     [3:a]atrim=0:0.2,asetpts=PTS-STARTPTS,volume=0.9000,adelay=delays=3000:all=1[a2];
     [a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,
                  aresample=async=1:first_pts=0[aout]"
  -map 0:v -map [aout]
  -c:v libx264 -pix_fmt yuv420p -crf 18
  -c:a aac -b:a 192k
  -shortest out.mp4
```

`adelay` is used (instead of `-itsoffset`) because the `asetpts` reset required after `atrim` wipes out any input-level time shift.

## Props

| Prop                 | Type      | Default     | Notes                                                            |
| -------------------- | --------- | ----------- | ---------------------------------------------------------------- |
| `src`                | `string`  | —           | URL or path. Relative paths resolve against the dev server root. |
| `from`               | `number`  | —           | Global frame index (not local-to-Sequence).                      |
| `durationInFrames`   | `number`  | —           | How long the cue should play, in frames.                         |
| `volume`             | `number`  | `1`         | Linear gain. `0.5` is roughly −6 dB.                             |
| `loop`               | `boolean` | `false`     | If true, the source is `-stream_loop -1`-ed before trim.         |
| `startOffset`        | `number`  | `0`         | Frames to skip from the start of the source.                     |

## Gotcha: `from` is global

If your `<Audio>` is nested inside a `<Sequence :from="60">`, its `from` is still in the **global timeline**. The Audio component does not inherit the sequence's frame shift. This is a deliberate v1 trade-off — it keeps audio collection in the renderer simple. A future version may add a sequence-aware Audio variant.
