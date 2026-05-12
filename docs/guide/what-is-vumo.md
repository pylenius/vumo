# What is vumo?

vumo lets you build videos out of Vue 3 components. Every video is a function of frame number: you define a composition, read the current frame via `useCurrentFrame()`, and let Vue's reactivity update the output as the timeline advances.

That same composition is also the source for a real rendered MP4 — vumo drives a headless Chromium instance through every frame, captures each screenshot, and stitches them into H.264 video with FFmpeg.

## Why?

Most video tools are either:

- **GUI editors** (DaVinci, Premiere, Final Cut) — great for hand-crafted content, slow for templated/data-driven work.
- **Programmatic systems for React** ([Remotion](https://www.remotion.dev/), [Revideo](https://re.video)) — the obvious choice if your UI is already in React.

If your app or design system is in Vue, vumo gives you the same model without context-switching frameworks.

## How does it differ from Remotion?

vumo is a smaller, opinionated Vue-native port — the same compositional model (frames as a function, sequences as time-shifters, `delayRender` for async asset gating, `Audio` for declarative cues), but built around Vue's reactivity and Vite's bundler instead of React's render loop.

vumo intentionally ships fewer features than Remotion in its first release. The roadmap covers what's still missing.

## When **not** to use vumo

- You need real-time playback at production framerates (vumo renders offline, not in real time)
- You need sample-accurate audio editing (the FFmpeg mux is millisecond-accurate via `adelay`, not sample-accurate)
- You're already invested in React (use Remotion — it has a vastly larger feature set and ecosystem)
