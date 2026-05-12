import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'vumo',
  description: 'Make videos programmatically with Vue 3.',
  base: '/vumo/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'GitHub', link: 'https://github.com/pylenius/vumo' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is vumo?', link: '/guide/what-is-vumo' },
            { text: 'Getting started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Authoring',
          items: [
            { text: 'Primitives', link: '/guide/primitives' },
            { text: 'Sequences', link: '/guide/sequences' },
            { text: 'Audio', link: '/guide/audio' },
            { text: 'Delaying render', link: '/guide/delay-render' },
          ],
        },
        {
          text: 'Rendering',
          items: [
            { text: 'The render pipeline', link: '/guide/rendering' },
            { text: 'CLI reference', link: '/guide/cli' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/pylenius/vumo' }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Inspired by Remotion. Built with Vue 3.',
    },
  },
});
