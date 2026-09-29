import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `npm run preview` sends the same security headers Vercel does, read from
// vercel.json, so a new script or API host that the CSP would block in
// production fails here first instead of on stage.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const securityHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]),
)

// The price file is imported into the bundle (offline from the first open)
// AND served at a stable URL, which the app re-fetches while it runs — so an
// installed app picks up the GitHub Action's latest prices without an update.
// One source file, src/data/prices.json, feeds both.
const PRICES = new URL('./src/data/prices.json', import.meta.url)
function livePrices() {
  return {
    name: 'ritu-live-prices',
    configureServer(server) {
      server.middlewares.use('/data/prices.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync(PRICES))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'data/prices.json', source: readFileSync(PRICES) })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    livePrices(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['satellite/*.png'],
      manifest: {
        name: 'RUTU — ऋतु',
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
        // Fonts too: all seven subsets are 600 KB, and a screen needs two or
        // three. They are cached the first time a screen asks for them (below).
        globIgnores: ['**/dist-*.js', '**/model/**', '**/fonts/**'],
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
            // live mandi prices: the newest deployed file when online, the
            // last one seen when not (the bundled copy covers a first open)
            urlPattern: /\/data\/prices\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ritu-prices',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
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
            // self-hosted typefaces: fetched on first use, then kept offline
            urlPattern: /\/fonts\/.*\.woff2$/,
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
  preview: { headers: securityHeaders },
})
