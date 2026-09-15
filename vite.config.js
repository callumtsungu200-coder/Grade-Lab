import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Dev-only stand-in for netlify/functions/pdf.mjs, so the in-app paper
// viewer works under `npm run dev` without the Netlify CLI. Same allow-list,
// same behaviour (inline or attachment via ?dl=1).
const PDF_HOSTS = new Set([
  'filestore.aqa.org.uk',
  'cdn.sanity.io',
  'qualifications.pearson.com',
  'www.ocr.org.uk',
  'pastpapers.download.wjec.co.uk',
  'www.wjec.co.uk',
  'www.eduqas.co.uk',
])
function pdfProxyDev() {
  return {
    name: 'gradelab-pdf-proxy-dev',
    configureServer(server) {
      server.middlewares.use('/api/pdf', async (req, res) => {
        const u = new URL(req.url, 'http://localhost')
        let target
        try {
          target = new URL(u.searchParams.get('url') || '')
        } catch {
          res.statusCode = 400
          return res.end('Bad url')
        }
        if (target.protocol !== 'https:' || !PDF_HOSTS.has(target.hostname)) {
          res.statusCode = 403
          return res.end('Host not allowed')
        }
        const name = (u.searchParams.get('name') || target.pathname.split('/').pop() || 'paper.pdf').replace(/[^\w.-]+/g, '_')
        const disposition = `${u.searchParams.get('dl') === '1' ? 'attachment' : 'inline'}; filename="${name}"`
        const UA = 'Mozilla/5.0 (compatible; GradeLab/1.0)'
        try {
          const up = await fetch(target, { headers: { 'User-Agent': UA } })
          if (!up.ok) {
            res.statusCode = 502
            return res.end('Upstream ' + up.status)
          }
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', disposition)
          res.end(Buffer.from(await up.arrayBuffer()))
        } catch (e) {
          const code = e && e.cause && e.cause.code
          // Antivirus / corporate "web shield" proxies intercept TLS from dev
          // servers and present a certificate Node doesn't trust. Dev-only,
          // allow-listed hosts only: retry with verification relaxed so the
          // viewer can be exercised locally. Production runs the Netlify
          // Function, which is unaffected.
          if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            console.warn(`[pdf-proxy-dev] TLS interception detected (${code}); relaxing verification for ${target.hostname}`)
            const https = await import('node:https')
            https
              .get(target, { rejectUnauthorized: false, headers: { 'User-Agent': UA } }, (up) => {
                if (up.statusCode && up.statusCode >= 300 && up.statusCode < 400 && up.headers.location) {
                  res.statusCode = 502
                  return res.end('Upstream redirect not followed')
                }
                if (up.statusCode !== 200) {
                  res.statusCode = 502
                  return res.end('Upstream ' + up.statusCode)
                }
                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', disposition)
                if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length'])
                up.pipe(res)
              })
              .on('error', (err) => {
                res.statusCode = 502
                res.end('Upstream error: ' + err.message)
              })
            return
          }
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e), cause: e && e.cause ? String(e.cause) : null, code: code || null }))
        }
      })
    },
  }
}

// Relative base so the built site works from any path (e.g. Netlify drag-and-drop).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    pdfProxyDev(),
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
        navigateFallbackDenylist: [/^\/api/, /^\/rest\//, /^\/auth\//, /\/(privacy|terms)\.html$/],
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
          {
            // Past papers already opened stay readable offline (capped).
            urlPattern: /\/api\/pdf\?/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'past-papers',
              expiration: { maxEntries: 25, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // While developing, register the SW too — makes offline testing easier.
      devOptions: { enabled: false },
    }),
  ],
})
