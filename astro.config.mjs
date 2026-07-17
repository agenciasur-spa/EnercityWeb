// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel/serverless'; // Versión 9 usa /serverless

// https://astro.build/config
export default defineConfig({
  site: 'https://asur-enercity-web.vercel.app',
  output: 'server',
  security: {
    checkOrigin: false
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  },
  adapter: vercel() // Activa el modo Serverless de Vercel
});