import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the built site works from any path (e.g. Netlify drag-and-drop).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // On each new deploy, download the new service worker in the background
      // and take over on the next page load. No "update available" prompt.
      registerType: 'autoUpdate',
      // Vite injects the SW registration script into the built index.html.
      injectRegister: 'auto',
      // We ship a hand-written public/manifest.webmanifest and link it from
      // index.html ourselves, so don't have the plugin generate its own.
      manifest: false,
      // Precache all built assets so first-load-offline works. `sw.js` is the
      // service worker file the plugin generates at build time.
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,webmanifest,woff,woff2}',
        ],
        // Grade Lab's main bundle is ~2.5 MB; raise the precache cap so the
        // whole app installs offline. Trade-off is a slightly larger first
        // download; fine for a study app people use daily.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Skip Supabase / other API calls — those need the network anyway.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/rest\//, /^\/auth\//],
        // Runtime caches for cross-origin things Grade Lab loads.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/img\/.*\.(?:png|jpg|jpeg|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'landing-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
      },
      // While developing, register the SW too — makes offline testing easier.
      devOptions: { enabled: false },
    }),
  ],
})
