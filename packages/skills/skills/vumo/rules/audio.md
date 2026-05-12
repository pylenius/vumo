# Audio

`<Audio>` registers a declarative audio cue: source file, global frame at which to start, how long to play, optional volume/loop/startOffset.

## Basic usage

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

The component renders nothing visible. It pushes a cue into the per-page audio registry on mount and never removes it.

## Props

| Prop                 | Type      | Default | Notes                                                                    |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------ |
| `src`                | `string`  | —       | URL or path. `/foo.wav` is resolved against the Vite `public/` dir.      |
| `from`               | `number`  | —       | **Global** frame index — not local to an enclosing `<Sequence>`.         |
| `durationInFrames`   | `number`  | —       | How long the cue plays, in frames.                                       |
| `volume`             | `number`  | `1`     | Linear gain. `0.5` ≈ −6 dB.                                              |
| `loop`               | `boolean` | `false` | If true, source is `-stream_loop -1`'d before trim.                      |
| `startOffset`        | `number`  | `0`     | Frames to skip from the start of the source file.                        |

## The "from is global" gotcha

If you put `<Audio>` inside a `<Sequence :from="60">`, the audio's `from` is still measured against the **composition's** timeline:

```vue
<Sequence :from="60" :duration-in-frames="60">
  <!-- This audio starts at GLOBAL frame 60, NOT 60 frames after the sequence starts. -->
  <Audio src="/sfx.wav" :from="60" :duration-in-frames="30" />
</Sequence>
```

If the `<Audio>` is inside a sequence that's not visible, the cue won't register until the sequence does mount. That's why the renderer captures audio cues **after** every frame has been rendered — by then, every Sequence-nested Audio has had a chance to mount at least once.

## Preview vs. render

**In the scrubber preview**: vumoMount's `<VumoPreview>` drives an `HTMLAudioElement` per cue with `currentTime` synced to the frame timer (0.12s drift tolerance). Best-effort, not sample-accurate.

**At render time**: the Node renderer queries `window.__vumoListAudioCues()` from every worker page, dedupes by source/from/duration/volume/loop/startOffset, downloads each `src` from the dev server, then muxes via FFmpeg:

```
[N:a]atrim=0:<duration>,asetpts=PTS-STARTPTS,volume=<v>,adelay=delays=<from_ms>:all=1[a_N]
[a_0][a_1]...[a_N]amix=inputs=<count>:duration=longest:normalize=0,aresample=async=1:first_pts=0[aout]
```

`adelay` is used instead of `-itsoffset` because the `asetpts=PTS-STARTPTS` reset (necessary after `atrim`) discards input-level timing shifts. Sample-accuracy is millisecond-level, not sample-level.

## When to use which approach

- **Background music**: one `<Audio src="/bg.wav" :from="0" :duration-in-frames="<full-duration>" />` with `:loop="true"` if the source is shorter than the composition.
- **One-shot SFX** (transitions, button clicks): a `<Audio>` per hit with the precise global `from` frame.
- **Voiceover**: one long `<Audio>` cue, possibly with `startOffset` to align speech to a visual cue.

## Anti-patterns

**FORBIDDEN — playing audio via `new Audio()` and `.play()` from a component.** That doesn't reach the renderer's cue collection at all, so the rendered MP4 will be silent. Always use `<Audio>` if the audio should appear in the output.

**FORBIDDEN — putting `<Audio>` inside a Sequence and writing `:from="0"` expecting it to mean "0 frames into the sequence".** It means global frame 0. The audio will play at the start of the whole video, not the start of the sequence.

**Mind your sample rates.** If you mix WAVs at 22050 Hz and 48000 Hz, FFmpeg will resample — that's fine — but the resampling adds noise. Pick one rate and stick with it across your assets.

## Future

- `interpolate`-able volume curves (currently constant per cue)
- Sequence-aware `<Audio>` whose `from` auto-shifts by parent offsets
- `<Video>` for embedded video clips with their own audio track
