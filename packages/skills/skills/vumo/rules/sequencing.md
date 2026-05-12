# Sequencing

`<Sequence>` is a wrapper that time-shifts its children. It's how you compose multiple clips on a single timeline.

## Mental model

```vue
<Sequence :from="60" :duration-in-frames="60">
  <Inner />
</Sequence>
```

Inside `<Inner>`:

- `useCurrentFrame()` returns the **shifted** frame: when the global frame is `75`, the inner frame is `15`.
- The slot only mounts while `60 <= globalFrame < 120`. Outside that range, `<Inner>` is unmounted.
- Component-level state (`ref`, `onMounted`) resets every time the sequence becomes visible again.

`<Sequence>` is essentially:

```vue
<template>
  <template v-if="visible">
    <slot />  <!-- with FrameKey re-provided as a shifted ref -->
  </template>
</template>
```

## Composing clips on a timeline

```vue
<template>
  <Sequence :from="0"   :duration-in-frames="60"><Intro /></Sequence>
  <Sequence :from="60"  :duration-in-frames="60"><Middle /></Sequence>
  <Sequence :from="120" :duration-in-frames="60"><Outro /></Sequence>
</template>
```

Each clip reads `useCurrentFrame()` and sees `0..59` — clips don't have to know their offset.

## Nesting

```vue
<Sequence :from="0" :duration-in-frames="180">
  <Sequence :from="30" :duration-in-frames="60">
    <Inner />
  </Sequence>
</Sequence>
```

`<Inner>` sees `globalFrame − 0 − 30 = globalFrame − 30`. Sequences compose additively.

## What `useVideoConfig()` does NOT do

`useVideoConfig()` is **not** sequence-aware. It always returns the outer composition's `fps`, `width`, `height`, `durationInFrames`. That's deliberate — `fps` is a property of the output video, not of a clip, and your easing math usually wants real fps.

If you need a clip's local duration, pass it as a prop:

```vue
<Sequence :from="60" :duration-in-frames="60">
  <MyClip :clip-duration="60" />
</Sequence>
```

## Gotchas

**Component state resets on remount.** A `<Sequence :duration-in-frames="60">` with frames 60–119 visible — when the global frame jumps to 200 and back to 80 (e.g., scrubbing), the child component remounts. Any local `ref` initial values reset, `onMounted` re-fires.

**`<Audio>` inside `<Sequence>` does NOT inherit the shift.** The cue's `from` prop is always global. See [audio.md](./audio.md).

**Don't put expensive setup inside a `<Sequence>` body if it remounts frequently.** Move it to the parent composition where it lives for the entire render.

## When NOT to use `<Sequence>`

For pure time-of-overall-comp visibility toggles (e.g. "show this badge only after frame 120"), a `v-if` against `frame.value` is fine — you don't need a sequence:

```vue
<template>
  <div v-if="frame >= 120">Hi</div>
</template>
```

Use `<Sequence>` when you also want the inner children to see a **local** frame (clip-relative).
