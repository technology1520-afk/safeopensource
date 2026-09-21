import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://safeopensource.org',
  output: 'static',
  integrations: [
    preact(),
    sitemap({
      filter: (page) => !page.includes('/404')
    })
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
});

