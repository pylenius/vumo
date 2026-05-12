# Delaying render

`delayRender()` lets a component tell the renderer "don't capture this frame yet — I'm loading something." `continueRender()` releases the hold.

```ts
import { onMounted } from 'vue';
import { delayRender, continueRender } from '@vumo/core';

onMounted(async () => {
  const handle = delayRender('load avatar image');
  await fetch('/api/avatar').then((r) => r.blob()); // or font loading, data fetch, etc.
  continueRender(handle);
});
```

## When the renderer waits

After each `__vumoSetFrame(n)` call, the renderer flushes Vue's microtask queue and then polls `window.__vumoReadyForCapture()`. That function returns `true` only when both:

- `document.fonts.status === 'loaded'`, and
- `getPendingRenderHandles().length === 0`

So a `delayRender` handle that's never continued will hang the render. The polling has a 30 s budget — past that, Puppeteer's `waitForFunction` throws.

## When **not** to use `delayRender`

- For deterministic animations driven only by frame number — they don't need it.
- For audio loading — audio is fetched by the renderer separately after capture.
- To pause for a "dramatic effect" — that's what `from` and `durationInFrames` are for.

`delayRender` is for **asset readiness**: fonts, images, JSON data, third-party SDK warm-up. If you don't actually need to block frame capture, leave it out.
