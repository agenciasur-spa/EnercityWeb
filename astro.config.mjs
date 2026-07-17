// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel/serverless'; // Versión 9 usa /serverless

// https://astro.build/config
const siteUrl = process.env.PUBLIC_SITE_URL
  || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:4321'}`;

export default defineConfig({
  site: siteUrl,
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