# delayRender / continueRender

`delayRender(label)` and `continueRender(handle)` are the **async asset gate**. They block the renderer's "this frame is ready to screenshot" signal until you call `continueRender` for every outstanding handle.

## API

```ts
import { delayRender, continueRender } from '@vumo/core';

const handle: number = delayRender('descriptive label');
// ...later, when whatever you were waiting for is done:
continueRender(handle);
```

`label` is optional but recommended — when the renderer times out (30 s budget), the label appears in the error message so you can find which call got stuck.

## What it actually does

The render harness in `@vumo/preview` exposes `window.__vumoReadyForCapture()`, which the Node renderer polls before screenshotting each frame. That function returns `true` only when:

1. `document.fonts.status === 'loaded'`, AND
2. `getPendingRenderHandles().length === 0`

So `delayRender` adds a handle to that pending list; `continueRender` removes it. The renderer's `page.waitForFunction` polls `__vumoReadyForCapture()` every 16 ms with a 30 s timeout. Past 30 s without all handles cleared, Puppeteer throws and the render fails.

## When to use

✅ **Custom font loading via `fontFace.load()`** (CSS-loaded fonts are automatically tracked by `document.fonts.ready`).
✅ **Fetching JSON / API data that drives the composition.**
✅ **Image preloading for assets that aren't already in the DOM.**
✅ **SDK initialization** that takes more than a frame's worth of microtasks.

## When NOT to use

❌ **For animation pauses or "wait N frames" effects.** Use a `v-if` against `frame.value`, or a `<Sequence :from>` instead.

❌ **For audio loading.** Audio is fetched by the renderer after capture, separately. Audio readiness has no effect on frame capture.

❌ **For static images already referenced in your template's `<img>` or `background-image`** — Puppeteer's `waitUntil: 'networkidle0'` on initial navigation handles those.

## Pattern: load-and-go in onMounted

```ts
import { onMounted, ref } from 'vue';
import { delayRender, continueRender } from '@vumo/core';

const data = ref<MyData | null>(null);

onMounted(async () => {
  const handle = delayRender('fetch chart data');
  try {
    const res = await fetch('/api/chart');
    data.value = await res.json();
  } finally {
    continueRender(handle);   // Always release the handle, even on error.
  }
});
```

The `try/finally` matters: if the fetch throws and you forget `continueRender`, the render hangs for 30 s and then fails with a confusing timeout error.

## Pattern: per-frame waits (rare)

If you need to wait on something that changes per frame (e.g., a deferred computation triggered by the new frame value), wrap it in a watcher:

```ts
import { watch } from 'vue';
import { useCurrentFrame, delayRender, continueRender } from '@vumo/core';

const frame = useCurrentFrame();

watch(frame, async (f) => {
  const handle = delayRender(`compute frame ${f}`);
  try {
    await someExpensiveCompute(f);
  } finally {
    continueRender(handle);
  }
});
```

In practice this is rare. Most setups want a one-shot delay at mount, not per-frame.

## Gotcha: handles inside `<Sequence>`

A `<Sequence>` mounts and unmounts its children based on visibility. A `delayRender` issued in a child's `onMounted` runs every time the sequence becomes visible (including after scrubbing back). Each call gets a new handle id — the registry never auto-cleans, so handles from earlier mounts can linger if you forget the `continueRender`.

The renderer polls the **current** pending list; old handles from earlier mounts would block forever. Always pair every `delayRender` with `continueRender` in a `finally`.

## Anti-patterns

**FORBIDDEN — calling `delayRender()` without `continueRender()` (ever).** The render will time out. There's no automatic GC.

**FORBIDDEN — using `delayRender` to slow down the render for visual effect.** The render is offline; "slowing it down" doesn't add frames or change duration. Use `durationInFrames` for that.
