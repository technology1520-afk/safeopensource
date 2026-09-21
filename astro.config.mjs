import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://safeopensource.org',
  output: 'static',
  security: {
    checkOrigin: false
  },
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    preact(),
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/admin')
    })
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
});

