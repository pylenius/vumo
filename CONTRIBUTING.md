# Contributing to vumo

Thanks for your interest. vumo is early — bug reports, design feedback, and PRs all welcome.

## Local development

```bash
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

Run the scrubber preview against one of the examples:

```bash
pnpm dev:hello          # examples/hello-world
pnpm --filter @vumo/example-sequences-demo dev
pnpm --filter @vumo/example-audio-demo dev
```

Render any example to MP4:

```bash
cd examples/hello-world
pnpm exec vumo render hello-world -o out.mp4
```

## Repo layout

- `packages/core` — Vue primitives. No Node deps. Vue is a peer.
- `packages/preview` — Browser scrubber + headless render harness. Vue peer.
- `packages/renderer` — Node-side. Vite (peer), Puppeteer, FFmpeg.
- `packages/cli` — Thin wrapper that calls `@vumo/renderer`.
- `examples/*` — Runnable demos that exercise the API.
- `docs/` — VitePress site.

`packages/core` and `packages/preview` ship Vue SFCs and build to `dist/` via Vite lib mode. `packages/renderer` and `packages/cli` are TS-only and build via `tsc`.

Workspace consumers (other packages + examples) resolve `main: src/index.ts` directly so there's no rebuild loop during dev. The npm-published versions use `publishConfig` to switch `main` to `dist/index.js`.

## Conventions

- TypeScript strict, `verbatimModuleSyntax` on. Use `import type` for type-only imports.
- Vue 3 Composition API with `<script setup>`.
- Prefer pure functions where possible — `buildFfmpegArgs` and the determinism shim are deliberately easy to test in isolation.
- Comments explain *why*, not *what*. No commit message references in code.

## Pull requests

- Add a changeset with `pnpm changeset` for any change that affects public API or behavior — the CI release workflow uses these.
- Keep examples runnable: if you add a primitive, add a small demo to an existing example or create a new one.
- Don't bypass pre-commit hooks (`--no-verify`).

## Open questions / known gaps

See the roadmap in [README.md](./README.md) and the [open issues](https://github.com/pylenius/vumo/issues).
