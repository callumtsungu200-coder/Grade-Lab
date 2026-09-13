// Builds src/pastPapersSeed.ts from verified link sets.
//
//   node scripts/build-past-papers-seed.mjs <dir-with-verified-json> src/pastPapersSeed.ts
//
// <dir> must contain verified-aqa-ocr.json and/or verified-pearson-eduqas.json:
// arrays of { subject, board, year, series, paper, tier, qpv:{url,ok}, msv:{url,ok} }
// produced by scraping the boards' own resource lists and HEAD-checking every
// URL. Only links that answered with a PDF are admitted; an entry is kept if
// at least one of its two links verified.
//
// Where the lists come from (2026-09):
//   AQA      — each subject's /assessment-resources page embeds its full list in
//              the Next.js payload (sanity.fileAsset objects: originalFilename +
//              assetId). Files are served from filestore.aqa.org.uk (older
//              series) or cdn.sanity.io (AQA's CMS CDN, newest series).
//   Pearson  — public Algolia index (app id / search key / index name are in
//              hidden inputs on their past-papers page); filter by
//              category:"Pearson-UK:Specification-Code/<code>", keep
//              Document-Type Question-paper / Mark-scheme, drop /secure/ paths.
//   OCR      — the J277 /assessment/ page lists the PDFs under "<year> - June
//              series" headings.
//   Eduqas   — /umbraco/surface/TabSurface/GetpastpapersTab?qualificationId=…
//              returns a React FilterableList whose props are HTML-escaped JSON.
import fs from 'node:fs'
import path from 'node:path'

const [dir, outFile] = process.argv.slice(2)
if (!dir || !outFile) {
  console.error('usage: node scripts/build-past-papers-seed.mjs <verified-json-dir> <out.ts>')
  process.exit(1)
}

const read = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  } catch {
    return []
  }
}
const sets = [...read('verified-aqa-ocr.json'), ...read('verified-pearson-eduqas.json')]

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const entries = []
let dropped = 0
let partial = 0
for (const e of sets) {
  const qp = e.qpv && e.qpv.ok ? e.qpv.url : ''
  const ms = e.msv && e.msv.ok ? e.msv.url : ''
  if (!qp && !ms) {
    dropped++
    continue
  }
  if ((e.qp && !qp) || (e.ms && !ms)) partial++
  entries.push({
    id: `seed:${slug(e.board)}:${slug(e.subject)}:${e.year}:${slug(e.series)}:${slug(e.paper)}${e.tier ? ':' + e.tier.toLowerCase() : ''}`,
    subject: e.subject,
    board: e.board,
    year: e.year,
    series: e.series,
    paper: e.paper,
    tier: e.tier || '',
    qp_url: qp,
    ms_url: ms,
  })
}
entries.sort(
  (a, b) =>
    a.subject.localeCompare(b.subject) ||
    b.year - a.year ||
    a.series.localeCompare(b.series) ||
    a.paper.localeCompare(b.paper, undefined, { numeric: true }) ||
    a.tier.localeCompare(b.tier),
)

const bySubject = {}
entries.forEach((e) => {
  bySubject[e.subject] = (bySubject[e.subject] || 0) + 1
})
const years = [...new Set(entries.map((e) => e.year))].sort()

const header = `/* AUTO-GENERATED — do not edit by hand.
   Official GCSE past papers, linked straight to the exam boards' own
   hosting (AQA, Pearson Edexcel, OCR, WJEC Eduqas). Nothing is re-hosted.

   Built ${new Date().toISOString().slice(0, 10)} from the boards' published
   resource lists; every URL was checked and answered with a PDF at build
   time. Coverage: ${years[0]}–${years[years.length - 1]} (no summer 2020 / 2021 exams
   were sat — the boards' November 2020 / 2021 series are included).

   Regenerate with scripts/build-past-papers-seed.mjs (see its header for
   where each board's list comes from). */

import type { PastPaper } from './pastPapers'

export const SEED_PAPERS: PastPaper[] = `

fs.writeFileSync(outFile, header + JSON.stringify(entries, null, 1).replace(/"([a-z_]+)":/g, '$1:') + '\n')
console.log('entries:', entries.length, 'partial (one link missing):', partial, 'dropped (no links):', dropped)
console.log(JSON.stringify(bySubject))
console.log('bytes:', fs.statSync(outFile).size)
