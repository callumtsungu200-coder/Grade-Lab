// Generates PWA / iOS-app icons for Grade Lab from the source app-icon PNG.
// Run: `node scripts/generate-icons.mjs`
// Source: public/app-icon-src.png  (square-ish flask + A+ card design)
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '..', 'public')
const src = path.join(publicDir, 'app-icon-src.png')
const outDir = path.join(publicDir, 'icons')

await mkdir(outDir, { recursive: true })

// Read source, pad to a perfect square on the source's dominant background (#000).
const srcMeta = await sharp(src).metadata()
const side = Math.max(srcMeta.width ?? 0, srcMeta.height ?? 0)
const squareBase = await sharp(src)
  .resize({ width: side, height: side, fit: 'contain', background: '#000000' })
  .png()
  .toBuffer()

const renders = [
  // Standard / iOS: full art edge-to-edge on its own black background.
  { name: 'icon-180.png', size: 180, inner: 1.0 },
  { name: 'icon-192.png', size: 192, inner: 1.0 },
  { name: 'icon-512.png', size: 512, inner: 1.0 },
  // Maskable: scale the art to 80% and keep the black background full-bleed,
  // so system masks (circle / squircle) don't clip the flask.
  { name: 'icon-maskable-512.png', size: 512, inner: 0.8 },
]

for (const r of renders) {
  const innerPx = Math.round(r.size * r.inner)
  const inner = await sharp(squareBase)
    .resize(innerPx, innerPx)
    .png()
    .toBuffer()
  const canvas = await sharp({
    create: {
      width: r.size,
      height: r.size,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(path.join(outDir, r.name), canvas)
  console.log(`wrote ${r.name} (${r.size}x${r.size}, ${canvas.length} bytes)`)
}

console.log('done')
