// Generates PWA / iOS-app icons for Grade Lab from the source SVG design.
// Run: `node scripts/generate-icons.mjs`
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '..', 'public')
const outDir = path.join(publicDir, 'icons')

// Rounded-corner icon: matches favicon (rx=11/40 = ~27.5% radius, iOS-ish squircle).
// Used for apple-touch-icon and manifest `purpose:"any"` icons.
const normalSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="512" height="512">
  <rect width="40" height="40" rx="11" fill="#059669"/>
  <path d="M20 12 L31 17 L20 22 L9 17 Z" fill="#ffffff"/>
  <path d="M13.5 19.5 V24 C13.5 25.9 16.4 27.2 20 27.2 C23.6 27.2 26.5 25.9 26.5 24 V19.5"
        fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M31 17 V25.2" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="31" cy="26.6" r="1.5" fill="#ffffff"/>
</svg>
`

// Maskable icon: full-bleed green background (system applies mask). Cap slightly
// smaller so it sits inside the 80% safe zone across circle / squircle masks.
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="512" height="512">
  <rect width="40" height="40" fill="#059669"/>
  <g transform="translate(20 20.5) scale(0.78) translate(-20 -20)">
    <path d="M20 12 L31 17 L20 22 L9 17 Z" fill="#ffffff"/>
    <path d="M13.5 19.5 V24 C13.5 25.9 16.4 27.2 20 27.2 C23.6 27.2 26.5 25.9 26.5 24 V19.5"
          fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M31 17 V25.2" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="31" cy="26.6" r="1.5" fill="#ffffff"/>
  </g>
</svg>
`

await mkdir(outDir, { recursive: true })

const renders = [
  { name: 'icon-180.png', size: 180, svg: normalSvg },        // iOS apple-touch-icon
  { name: 'icon-192.png', size: 192, svg: normalSvg },        // manifest
  { name: 'icon-512.png', size: 512, svg: normalSvg },        // manifest
  { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg }, // manifest maskable
]

for (const r of renders) {
  const buf = await sharp(Buffer.from(r.svg))
    .resize(r.size, r.size)
    .png()
    .toBuffer()
  await writeFile(path.join(outDir, r.name), buf)
  console.log(`wrote ${r.name} (${r.size}x${r.size}, ${buf.length} bytes)`)
}

console.log('done')
