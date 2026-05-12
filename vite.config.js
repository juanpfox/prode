import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // iPhone 12 shipped with iOS 14 (Safari 14) but most devices today are on
    // iOS 15+. Vite 7's default ("baseline-widely-available") excludes
    // Safari < 16.4, which is likely why iPhone 12 users on iOS 15 saw a
    // blank page. safari15 is fully supported by esbuild and covers >99% of
    // iPhone 12 users in 2026. For iOS 14 hold-outs, add @vitejs/plugin-legacy.
    target: ['es2020', 'safari15', 'chrome90', 'firefox90', 'edge90'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Prode Mundial',
        short_name: 'Prode',
        description: 'Pronósticos para el Mundial 2026 y Champions League',
        theme_color: '#16a34a',
        background_color: '#0c1a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        skipWaiting: true,
        clientsClaim: true,
        // Critical: delete precaches from previous deploys so a phone that
        // had v1 cached and then opens v2 doesn't end up serving a mix.
        cleanupOutdatedCaches: true,
        // Ensure SPA route requests always resolve to the current index.html.
        navigateFallback: '/index.html',
      },
    }),
  ],
})
