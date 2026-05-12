# The render pipeline

```
vumo render <id>
   │
   ▼
┌────────────────────────────────────────────────────────────┐
│ 1. Vite dev server (programmatic createServer)             │
│    – reads your project's vite.config.ts                   │
│    – serves /?vumoRender=1                                 │
├────────────────────────────────────────────────────────────┤
│ 2. Puppeteer launches headless Chromium                    │
│    – injects determinism shim (Math.random, Date.now)      │
│    – disables tab throttling                               │
├────────────────────────────────────────────────────────────┤
│ 3. Probe page enumerates registered compositions           │
├────────────────────────────────────────────────────────────┤
│ 4. N worker pages, each:                                   │
│     – goto(?vumoRender=1)                                  │
│     – __vumoSelectComposition(id)                          │
│     – round-robin assigned frame indices                   │
├────────────────────────────────────────────────────────────┤
│ 5. Per frame:                                              │
│     a. __vumoReseed(frame)                                 │
│     b. __vumoTimeMs = frame * 1000/fps                     │
│     c. __vumoSetFrame(frame), flush Vue microtasks         │
│     d. waitForFunction(__vumoReadyForCapture)              │
│     e. page.screenshot({ clip: { width, height } })        │
│     f. write frame-NNNNNN.png                              │
├────────────────────────────────────────────────────────────┤
│ 6. Union audio cues across worker pages, download srcs     │
├────────────────────────────────────────────────────────────┤
│ 7. FFmpeg: PNG sequence → H.264; audio cues mixed via      │
│    atrim + asetpts + volume + adelay + amix                │
├────────────────────────────────────────────────────────────┤
│ 8. Cleanup: browser.close(), server.close(), rm temp dirs  │
└────────────────────────────────────────────────────────────┘
```

## Determinism

The shim ensures `Math.random()`, `Date.now()`, and `performance.now()` are pure functions of the frame number. Random sequences are seeded with a hashed frame index before each capture, so worker-1 and worker-N produce identical pixel data for a given frame.

Caveats:

- The H.264 encoder isn't bit-exact between runs — even back-to-back renders of the same source produce slightly different encoded bytes.
- Sub-pixel rasterization (gradients, antialiased edges) can vary slightly across hardware.

For perceptually identical output, the determinism shim is sufficient. For byte-exact reproducibility, you'd need a deterministic encoder pass (out of scope for v1).

## Choosing `--workers`

vumo's default is `min(cpu_count, 4)`. Increasing workers helps until the Vite dev server's module-transform pipeline becomes the bottleneck — typically around 2–4 workers for a single composition. The first published `0.x` release does not yet include a production static-bundle path, which is what unblocks higher parallelism.
