import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['satellite/*.png'],
      manifest: {
        name: 'RITU — ऋतु',
        short_name: 'ऋतु',
        description: 'हवामान बदललं. आता माहितीही बदलेल.',
        lang: 'mr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#DCD7C9',
        theme_color: '#2E6B3F',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // the app shell, the precomputed data and the satellite frames are all
        // cached, so a farmer on 2G opens to a working advisory offline
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // TensorFlow.js is ~1 MB and only the disease screen needs it.
        // Precaching it would push that megabyte onto every farmer on 2G at
        // first load, which is exactly what the lazy import avoids. It is
        // fetched on demand and cached at runtime instead (rule below).
        globIgnores: ['**/dist-*.js', '**/model/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // the tfjs chunk and the model weights: fetched once, then kept,
            // so the second diagnosis works with no signal at all
            urlPattern: /\/(assets\/dist-.*\.js|model\/.*)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ritu-disease-model',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // live forecast: try the network, fall back to the last good copy
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ritu-forecast',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ritu-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
})
