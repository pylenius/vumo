# Determinism

The renderer injects a determinism shim into every Puppeteer page before any user code loads. The goal: same input frame number → same pixel output, regardless of when (or by which worker) the frame is captured.

## What the shim does

```js
// Injected by the renderer via page.evaluateOnNewDocument(DETERMINISM_SHIM)
Math.random = seededLCG();           // mulberry-ish, re-seedable
window.__vumoReseed = (frame) => {   // hashes frame to a seed
  // Called per-frame by the renderer before __vumoSetFrame.
};
Date.now = () => __vumoTimeMs | 0;        // clamped to frame * 1000/fps
performance.now = () => __vumoTimeMs;     // same
```

Combined with `__vumoSetFrame(n)` (which writes to the global `frame` ref), this means:

- `Math.random()` returns the same sequence for the same frame number.
- `Date.now()` and `performance.now()` return `frame * (1000 / fps)` rounded.
- A frame captured by worker 0 vs. worker 3 sees the same time/random state.

## What the shim does NOT cover

- **Sub-pixel rasterization.** Different GPUs / driver versions can produce slightly different antialiased edges, especially on gradients and rotated rectangles. The shim has no control over Chromium's internal compositor.
- **H.264 encoder non-determinism.** `libx264` is not bit-exact across runs even with identical PNG input — encoder timing and threading vary. The MP4's framemd5 hashes will differ; the decoded pixels are visually identical.
- **External clocks.** `crypto.getRandomValues`, `BroadcastChannel`, `Date` constructors with no args — the shim doesn't catch all of them. Avoid these in compositions.
- **Network responses.** Any `fetch()` to a non-deterministic API will obviously vary. Either gate on `delayRender` to wait for the response, or mock the data.

## Practical rules for deterministic compositions

✅ All animation is a function of `frame.value` only.
✅ Random offsets use `Math.random()` (seeded), not `crypto.getRandomValues`.
✅ Async data is fetched in `onMounted` behind a `delayRender` gate.
✅ Fonts are loaded via CSS `@font-face`; the renderer waits for `document.fonts.ready`.

❌ Don't use `Date.now()` (or `new Date()`) to drive animations.
❌ Don't store state in module-level vars that mutate per render — workers each have their own JS context, but multiple pages in the same browser share other state (cookies, storage).
❌ Don't rely on the order of `Math.random()` calls staying stable across vumo versions. The seeded RNG is internal API.

## Checking your own determinism

Render the same composition twice with the same `--workers` value and the same source. Decode both MP4s to PNG sequences and diff:

```bash
ffmpeg -i a.mp4 a/%06d.png
ffmpeg -i b.mp4 b/%06d.png
for f in a/*.png; do diff -q "$f" "b/$(basename "$f")" >/dev/null || echo "differs: $(basename "$f")"; done
```

Some differences are expected from H.264 re-encode noise even with identical PNG sources. For source-level determinism, save the captured frames before encoding (a `--keep-frames` flag isn't yet in the CLI; you can patch `render.ts` locally to skip the temp-dir cleanup).

## What if I genuinely need a different random sequence per render?

Build it in. Accept a seed as a prop on your composition:

```ts
defineComposition({
  id: 'particle-field',
  component: ParticleField,
  width: 1280, height: 720, fps: 30, durationInFrames: 150,
  props: { seed: 12345 },
});
```

Then in `ParticleField.vue`, derive your own random from the seed + frame:

```ts
const positions = computed(() => {
  const rnd = seededRandom(props.seed + Math.floor(frame.value / 30));
  return Array.from({ length: 20 }, () => ({ x: rnd() * width, y: rnd() * height }));
});
```

To re-render with different particles, change the prop — never mutate state.
