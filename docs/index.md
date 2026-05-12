---
layout: home

hero:
  name: vumo
  text: Make videos programmatically with Vue 3
  tagline: A Vue-native port of Remotion. Compose videos as Vue components, preview in the browser, render to MP4.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/pylenius/vumo

features:
  - icon: 🎞️
    title: Vue components are video frames
    details: useCurrentFrame returns a reactive ref. Anything that reads it re-renders as the timeline advances. No special DSL, just regular Vue.
  - icon: ⚡
    title: Scrubber preview with HMR
    details: Drag a frame slider, press space, scrub backward and forward. Changes to your composition hot-reload instantly.
  - icon: 🎬
    title: Headless render to MP4
    details: A parallel Puppeteer pool drives your composition frame-by-frame, deterministically. FFmpeg muxes audio and encodes H.264.
  - icon: 🔊
    title: Declarative audio
    details: Drop in &lt;Audio src=&quot;…&quot; :from=&quot;30&quot; :duration-in-frames=&quot;6&quot; /&gt; — the renderer collects every cue and mixes them with frame-accurate timing.
---
