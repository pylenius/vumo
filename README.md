# vumo

Make videos programmatically with Vue 3 — a Vue-native port of [Remotion](https://www.remotion.dev/).

> **Status:** v0 — Phase 1 scaffold. Not yet usable for real videos.

## What works today

- `@vumo/core` — Vue composables and components for declaring compositions
- `@vumo/preview` — In-browser scrubber + play/pause preview
- `examples/hello-world` — runnable demo

## Roadmap

- **Phase 2** — Puppeteer + FFmpeg → MP4 renderer
- **Phase 3** — `<Sequence>` time-shifting, `delayRender`, worker pool
- **Phase 4** — `<Audio>` + audio mux
- **Phase 5** — Docs site, first OSS release (`0.1.0`)

## Quick start

```bash
pnpm install
pnpm dev:hello
```

Open the browser at the URL Vite prints. Drag the scrubber or hit space to play.

## Repo layout

```
packages/
  core/      Vue primitives (useCurrentFrame, useVideoConfig, defineComposition)
  preview/   Browser preview UI (VumoPreview, Scrubber, Controls)
examples/
  hello-world/   Runnable demo composition
```

## Acknowledgements

Heavily inspired by [Remotion](https://www.remotion.dev/) — the React framework that pioneered "videos as code." vumo aims to bring the same model to Vue 3.

## License

MIT (planned — not yet published).
