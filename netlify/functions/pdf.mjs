/* Same-origin proxy for official past-paper PDFs.

   The exam boards' hosts either forbid embedding (x-frame-options) or
   forbid cross-origin fetches (no CORS), and iOS can't render PDFs in an
   iframe anyway. Streaming the bytes through here lets the in-app PDF.js
   viewer render them on every device, and `?dl=1` turns the same URL
   into a real download.

   Allow-listed to the boards' own hosts only, so this can't be used as an
   open proxy. Responses are cached at the edge for a month. */

const ALLOWED_HOSTS = new Set([
  'filestore.aqa.org.uk',
  'cdn.sanity.io', // AQA's CMS CDN (newest series)
  'qualifications.pearson.com',
  'www.ocr.org.uk',
  'pastpapers.download.wjec.co.uk',
  'www.wjec.co.uk',
  'www.eduqas.co.uk',
])

export default async (req) => {
  const params = new URL(req.url).searchParams
  let target
  try {
    target = new URL(params.get('url') || '')
  } catch {
    return new Response('Bad url', { status: 400 })
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response('Host not allowed', { status: 403 })
  }

  let upstream
  try {
    upstream = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GradeLab/1.0)', Accept: 'application/pdf,*/*' },
      redirect: 'follow',
    })
  } catch (e) {
    return new Response(`Upstream fetch failed: ${e.message}`, { status: 502 })
  }
  if (!upstream.ok) return new Response(`Upstream ${upstream.status}`, { status: 502 })

  const name = (params.get('name') || target.pathname.split('/').pop() || 'paper.pdf').replace(/[^\w.-]+/g, '_')
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${params.get('dl') === '1' ? 'attachment' : 'inline'}; filename="${name}"`,
    'Cache-Control': 'public, max-age=86400, s-maxage=2592000',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)

  return new Response(upstream.body, { status: 200, headers })
}

export const config = { path: '/api/pdf' }
