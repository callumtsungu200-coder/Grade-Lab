import { Component, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PastPaper } from '../pastPapers'

/* In-app past-paper viewer.

   Source order for the PDF bytes:
     1. /api/pdf (same-origin proxy — works for every board, every device)
     2. the board's URL directly (only Pearson sends CORS headers)
   then pages render through PDF.js onto canvases, lazily as they scroll
   into view. If neither source yields bytes, fall back to an <iframe> on
   hosts that allow embedding (not on iOS, where PDF iframes don't scroll),
   and finally to an "open in a new tab" panel. Download uses the proxy's
   attachment mode when available, otherwise a blob of the loaded bytes. */

type Kind = 'qp' | 'ms'
type Status = 'loading' | 'ready' | 'iframe' | 'external' | 'error'
type Source = 'proxy' | 'direct'

// Minimal surface of the PDF.js types we touch (the package is lazy-loaded).
interface PdfPage {
  getViewport(opts: { scale: number }): { width: number; height: number }
  render(params: Record<string, unknown>): { promise: Promise<void>; cancel(): void }
}
interface PdfDoc {
  numPages: number
  getPage(n: number): Promise<PdfPage>
}
// Teardown lives on the loading task, not the document proxy (pdfjs-dist 6).
interface PdfLoadingTask {
  promise: Promise<PdfDoc>
  destroy(): Promise<void>
}
function safeDestroy(task: PdfLoadingTask | null) {
  try {
    if (task && typeof task.destroy === 'function') void task.destroy()
  } catch {
    /* never let teardown throw — an exception here would unmount the app */
  }
}

const PROXY = '/api/pdf'
const FRAMEABLE_HOSTS = ['filestore.aqa.org.uk', 'www.ocr.org.uk', 'cdn.sanity.io']
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

const tierLabel = (t: string) => (t === 'H' ? 'Higher' : t === 'F' ? 'Foundation' : '')
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function proxyUrl(url: string, name: string, dl = false): string {
  const p = new URLSearchParams({ url, name })
  if (dl) p.set('dl', '1')
  return `${PROXY}?${p.toString()}`
}

function fileName(paper: PastPaper, subjectName: string, kind: Kind): string {
  const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug(paper.board)}-${slug(subjectName)}-${slug(paper.paper)}${paper.tier ? '-' + paper.tier : ''}-${slug(
    paper.series,
  )}-${paper.year}-${kind.toUpperCase()}.pdf`
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import('pdfjs-dist')
      const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      lib.GlobalWorkerOptions.workerSrc = worker
      return lib
    })()
  }
  return pdfjsPromise
}

/* ------------------------------------------------------------ One page */

function Page({ doc, num, width, zoom }: { doc: PdfDoc; num: number; width: number; zoom: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [inView, setInView] = useState(false)
  const [ratio, setRatio] = useState(1.414) // A4 until measured

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '900px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!inView) {
      // Release memory for pages far off-screen.
      if (c) {
        c.width = 0
        c.height = 0
      }
      return
    }
    let cancelled = false
    let task: { promise: Promise<void>; cancel(): void } | null = null
    ;(async () => {
      let page: PdfPage
      try {
        page = await doc.getPage(num)
      } catch {
        return // document torn down mid-flight (e.g. switched to the mark scheme)
      }
      if (cancelled || !canvas.current) return
      const base = page.getViewport({ scale: 1 })
      const r = base.height / base.width
      setRatio(r)
      const cssWidth = Math.floor(width * zoom)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const vp = page.getViewport({ scale: (cssWidth / base.width) * dpr })
      const el = canvas.current
      el.width = Math.floor(vp.width)
      el.height = Math.floor(vp.height)
      el.style.width = `${cssWidth}px`
      el.style.height = `${Math.floor(cssWidth * r)}px`
      const ctx = el.getContext('2d')
      if (!ctx) return
      try {
        task = page.render({ canvasContext: ctx, viewport: vp })
        await task.promise
      } catch (e) {
        // Newer PDF.js prefers `canvas`; RenderingCancelled is expected on re-render.
        if (!cancelled && !/cancel/i.test(String(e))) {
          try {
            task = page.render({ canvas: el, viewport: vp })
            await task.promise
          } catch {
            /* give up on this page */
          }
        }
      }
    })()
    return () => {
      cancelled = true
      try {
        task?.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [doc, num, width, zoom, inView])

  const cssWidth = Math.floor(width * zoom)
  return (
    <div ref={wrap} className="pv-page" style={{ width: cssWidth, height: Math.floor(cssWidth * ratio) }}>
      <canvas ref={canvas} />
      <span className="pv-page-num" aria-hidden="true">
        {num}
      </span>
    </div>
  )
}

/* ----------------------------------------------------------- The viewer */

export interface PaperViewerProps {
  paper: PastPaper
  subjectName: string
  initial: Kind
  onClose: () => void
}

function PaperViewerInner({ paper, subjectName, initial, onClose }: PaperViewerProps) {
  const [kind, setKind] = useState<Kind>(initial)
  const url = kind === 'qp' ? paper.qp_url : paper.ms_url
  const name = fileName(paper, subjectName, kind)

  const [status, setStatus] = useState<Status>('loading')
  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(0)
  const body = useRef<HTMLDivElement>(null)

  // Fit-width measurement.
  useEffect(() => {
    const el = body.current
    if (!el) return
    const measure = () => setWidth(Math.max(240, Math.min(el.clientWidth - 32, 900)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Lock page scroll; Esc closes.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Load the document whenever the URL changes.
  useEffect(() => {
    let alive = true
    let task: PdfLoadingTask | null = null
    setStatus('loading')
    setDoc(null)
    setSource(null)
    setZoom(1)
    setBlobUrl((b) => {
      if (b) URL.revokeObjectURL(b)
      return null
    })
    if (!url) {
      setStatus('error')
      return
    }
    ;(async () => {
      let data: ArrayBuffer | null = null
      let src: Source | null = null
      try {
        const r = await fetch(proxyUrl(url, name))
        if (r.ok && /pdf/i.test(r.headers.get('content-type') || '')) {
          data = await r.arrayBuffer()
          src = 'proxy'
        }
      } catch {
        /* proxy not deployed / offline */
      }
      if (!data) {
        try {
          const r = await fetch(url, { mode: 'cors' })
          if (r.ok) {
            data = await r.arrayBuffer()
            src = 'direct'
          }
        } catch {
          /* no CORS on this host */
        }
      }
      if (!alive) return
      const fallback = () => setStatus(!isIOS && FRAMEABLE_HOSTS.includes(hostOf(url)) ? 'iframe' : 'external')
      if (!data) {
        fallback()
        return
      }
      // Blob first: PDF.js transfers the buffer to its worker (detaching it).
      const blob = new Blob([data], { type: 'application/pdf' })
      try {
        const pdfjs = await loadPdfjs()
        task = pdfjs.getDocument({ data: new Uint8Array(data) }) as unknown as PdfLoadingTask
        const d = await task.promise
        if (!alive) {
          safeDestroy(task)
          return
        }
        setDoc(d)
        setSource(src)
        setBlobUrl(URL.createObjectURL(blob))
        setStatus('ready')
      } catch (e) {
        console.warn('PDF render failed', e)
        if (alive) fallback()
      }
    })()
    return () => {
      alive = false
      safeDestroy(task)
    }
  }, [url, name])

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  const downloadHref = source === 'proxy' ? proxyUrl(url, name, true) : blobUrl || url
  const canDownloadDirect = source === 'proxy' || !!blobUrl
  const both = !!paper.qp_url && !!paper.ms_url

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={`${subjectName} — ${paper.paper} — ${paper.series} ${paper.year}`}>
      <header className="pv-top">
        <button type="button" className="btn ghost pv-close" onClick={onClose}>
          ← Back
        </button>
        <div className="pv-title">
          <span className="pv-title-main">
            {paper.paper}
            {paper.tier ? ` · ${tierLabel(paper.tier)}` : ''}
          </span>
          <span className="pv-title-sub">
            {subjectName} · {paper.board} · {paper.series} {paper.year}
          </span>
        </div>
        {both && (
          <div className="pv-seg" role="tablist" aria-label="Document">
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'qp'}
              className={'pv-seg-btn' + (kind === 'qp' ? ' active' : '')}
              onClick={() => setKind('qp')}
            >
              Question paper
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'ms'}
              className={'pv-seg-btn' + (kind === 'ms' ? ' active' : '')}
              onClick={() => setKind('ms')}
            >
              Mark scheme
            </button>
          </div>
        )}
        <div className="pv-tools">
          {status === 'ready' && doc && (
            <>
              <span className="pv-pages">{doc.numPages} pages</span>
              <button type="button" className="btn icon" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))} aria-label="Zoom out">
                −
              </button>
              <button type="button" className="btn icon pv-fit" onClick={() => setZoom(1)} aria-label="Fit to width">
                Fit
              </button>
              <button type="button" className="btn icon" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))} aria-label="Zoom in">
                +
              </button>
            </>
          )}
          {url && (
            <a
              className="btn"
              href={downloadHref}
              download={canDownloadDirect ? name : undefined}
              target={canDownloadDirect ? undefined : '_blank'}
              rel="noreferrer noopener"
            >
              Download
            </a>
          )}
          {url && (
            <a className="btn ghost pv-open" href={url} target="_blank" rel="noreferrer noopener">
              Open ↗
            </a>
          )}
        </div>
      </header>

      <div className={'pv-body' + (status === 'iframe' ? ' is-iframe' : '')} ref={body}>
        {status === 'loading' && (
          <div className="pv-status" role="status">
            <span className="pv-spinner" aria-hidden="true" /> Loading {kind === 'qp' ? 'question paper' : 'mark scheme'}…
          </div>
        )}
        {status === 'ready' && doc && width > 0 && (
          <div className="pv-col">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <Page key={`${url}#${i + 1}`} doc={doc} num={i + 1} width={width} zoom={zoom} />
            ))}
          </div>
        )}
        {status === 'iframe' && <iframe className="pv-iframe" src={url} title={name} />}
        {(status === 'external' || status === 'error') && (
          <div className="pv-external">
            <p className="pv-external-title">
              {status === 'error' ? 'There’s no file for this one.' : 'This one can’t be shown inside Grade Lab.'}
            </p>
            <p className="pv-external-sub">
              {status === 'error'
                ? 'The exam board hasn’t published it.'
                : 'Open it in a new tab — you can save it from there.'}
            </p>
            {url && (
              <a className="btn big" href={url} target="_blank" rel="noreferrer noopener">
                Open in new tab ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* Error boundary: a viewer failure must never take the rest of Grade Lab
   down with it. Falls back to a plain "open in new tab" panel. */
class PaperViewer extends Component<PaperViewerProps, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('PaperViewer crashed', error)
  }
  render(): ReactNode {
    if (!this.state.failed) return <PaperViewerInner {...this.props} />
    const { paper, initial, onClose } = this.props
    const url = initial === 'qp' ? paper.qp_url : paper.ms_url
    return (
      <div className="pv" role="dialog" aria-modal="true" aria-label="Paper viewer">
        <header className="pv-top">
          <button type="button" className="btn ghost pv-close" onClick={onClose}>
            ← Back
          </button>
        </header>
        <div className="pv-body">
          <div className="pv-external">
            <p className="pv-external-title">The viewer hit a problem.</p>
            <p className="pv-external-sub">Open the file in a new tab instead.</p>
            {url && (
              <a className="btn big" href={url} target="_blank" rel="noreferrer noopener">
                Open in new tab ↗
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default PaperViewer
