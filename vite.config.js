import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE: ruta donde se sirve la app.
//  - Firebase Hosting / dominio propio -> '/'  (por defecto)
//  - GitHub Pages en un repo           -> '/nombre-del-repo/'  (ej: VITE_BASE=/organiza/ npm run build)
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(5, 16).replace('T', ' ')) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-v3.png', 'icons/favicon-v3.png', 'icons/logo.png'],
      manifest: {
        name: 'Seiri',
        short_name: 'Seiri',
        description: 'Tu vida académica y laboral en un solo sitio.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0b0c',
        theme_color: '#0b0b0c',
        icons: [
          { src: 'icons/icon-192-v3.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512-v3.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-v3.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Service worker: cachea la app entera para que funcione sin conexión.
      // push-sw.js (carpeta public) añade al service worker la recepción de notificaciones push.
      workbox: {
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
