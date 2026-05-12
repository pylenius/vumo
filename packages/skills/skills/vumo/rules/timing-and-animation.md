# Timing and animation

vumo does **not** yet ship `interpolate()` or `spring()` helpers (Remotion has them; planned for a future vumo release). All animations are derived from `frame.value` via plain math. This file documents the patterns that match Remotion's helpers closely enough to port code from one to the other.

## The frame timer

```ts
import { useCurrentFrame, useVideoConfig } from '@vumo/core';

const frame = useCurrentFrame();          // Ref<number>
const { fps } = useVideoConfig();          // number
const seconds = computed(() => frame.value / fps);
```

`frame.value` advances by 1 per output frame. `fps` is the composition's fps (not framerate of the actual playback device — the rendered MP4 plays at that fps regardless of where it's viewed).

## Linear interpolation

The Remotion equivalent:

```ts
// Remotion:
interpolate(frame, [0, 60], [0, 1])
```

vumo:

```ts
const t = computed(() => clamp01((frame.value - 0) / (60 - 0)));
const out = computed(() => 0 + (1 - 0) * t.value);

function clamp01(x: number) { return Math.min(1, Math.max(0, x)); }
```

Helper you can drop into a `utils.ts`:

```ts
export function remap(
  x: number,
  fromMin: number, fromMax: number,
  toMin: number, toMax: number,
  clamp: boolean = true,
): number {
  const t = (x - fromMin) / (fromMax - fromMin);
  const clamped = clamp ? Math.min(1, Math.max(0, t)) : t;
  return toMin + (toMax - toMin) * clamped;
}
```

Usage:

```ts
const opacity = computed(() => remap(frame.value, 0, 30, 0, 1));     // fade in over 30 frames
const x       = computed(() => remap(frame.value, 30, 60, -200, 0)); // slide from -200px to 0 over frames 30-60
```

## Easing

For non-linear motion, apply an ease function to the `t` value, not to the output range.

```ts
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

const eased = computed(() => {
  const t = remap(frame.value, 0, 30, 0, 1);
  return easeOutCubic(t);
});
```

Bezier easing (matches Remotion's `Easing.bezier(0.16, 1, 0.3, 1)` — the "snappy" curve):

```ts
function bezierEasing(p1x: number, p1y: number, p2x: number, p2y: number) {
  // Cubic Bezier in t, returns y for given x via Newton-Raphson.
  // Cheap-and-correct implementation:
  return (x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const sx = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
      const dx = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
      if (Math.abs(dx) < 1e-6) break;
      t -= (sx - x) / dx;
    }
    return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  };
}

const snappy = bezierEasing(0.16, 1, 0.3, 1);
const eased = computed(() => snappy(remap(frame.value, 0, 30, 0, 1)));
```

## Spring (approximation)

There's no exact spring helper. For most UI feel, a critically-damped exponential approach is enough:

```ts
function spring({ frame, fps, mass = 1, stiffness = 100, damping = 20 }: {
  frame: number; fps: number; mass?: number; stiffness?: number; damping?: number;
}): number {
  // Closed-form for critically damped & underdamped springs:
  const t = frame / fps;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) {
    // Critically damped
    return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  }
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
}

const scale = computed(() => spring({ frame: frame.value, fps }));
```

This isn't bit-compatible with Remotion's `spring()` but produces a visually similar bounce.

## Loop / pingpong

```ts
const loopT = computed(() => (frame.value % 60) / 60);           // 0→1 over 60 frames, repeats
const pingpong = computed(() => {
  const t = (frame.value % 60) / 60;
  return t < 0.5 ? t * 2 : (1 - t) * 2;                          // 0→1→0
});
```

## Sine / cosine motion

For continuous breathing/wobble:

```ts
const breath = computed(() => 1 + 0.1 * Math.sin((frame.value / fps) * Math.PI * 2 * 0.5));
//                                                                            ^^^ Hz
// 0.5 Hz = one cycle every 2 seconds, ±10% scale variation.
```

## Don't reach for the wall clock

The determinism shim clamps `Date.now()` and `performance.now()` to frame-derived time, so they're safe — but you should still write animations as pure functions of `frame.value`. This keeps the same code working in the preview scrubber (where you can jump around in time freely) and in render mode (where frames are captured in any order by parallel workers).
