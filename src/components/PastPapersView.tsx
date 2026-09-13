import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Subject } from './Sidebar'
import { fetchPapers, addPaper, deletePaper } from '../pastPapers'
import type { PastPaper, Tier } from '../pastPapers'

interface Props {
  subject: Subject
  /** owner account — shows the post / remove controls */
  canPost: boolean
}

const SERIES = ['June', 'November', 'January', 'Specimen', 'Sample']
const TIERS: { v: Tier; label: string }[] = [
  { v: '', label: 'No tier' },
  { v: 'F', label: 'Foundation' },
  { v: 'H', label: 'Higher' },
]

const tierLabel = (t: Tier) => (t === 'H' ? 'Higher' : t === 'F' ? 'Foundation' : '')

export default function PastPapersView({ subject, canPost }: Props) {
  const board = (subject.spec || '').split(' ')[0]

  const [papers, setPapers] = useState<PastPaper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<'all' | Tier>('all')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    year: String(new Date().getFullYear() - 1),
    series: 'June',
    paper: 'Paper 1',
    tier: '' as Tier,
    qp_url: '',
    ms_url: '',
    notes: '',
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchPapers(subject.id).then((r) => {
      if (!alive) return
      setPapers(r.data)
      setError(r.error)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [subject.id])

  const hasTiers = papers.some((p) => p.tier)
  const visible = useMemo(
    () => papers.filter((p) => tier === 'all' || (p.tier || '') === tier),
    [papers, tier],
  )
  const byYear = useMemo(() => {
    const m = new Map<number, PastPaper[]>()
    visible.forEach((p) => {
      if (!m.has(p.year)) m.set(p.year, [])
      m.get(p.year)!.push(p)
    })
    return [...m.entries()].sort((a, b) => b[0] - a[0])
  }, [visible])
  const deviceOnly = papers.filter((p) => p.local).length

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.qp_url.trim() && !form.ms_url.trim()) {
      setError('Add a link to the question paper or the mark scheme.')
      return
    }
    setSaving(true)
    const r = await addPaper({
      subject: subject.id,
      board,
      year: Number(form.year),
      series: form.series,
      paper: form.paper.trim() || 'Paper',
      tier: form.tier,
      qp_url: form.qp_url.trim(),
      ms_url: form.ms_url.trim(),
      notes: form.notes.trim(),
    })
    setSaving(false)
    setError(r.error)
    if (r.data) {
      setPapers((list) => [r.data!, ...list])
      setAdding(false)
      setForm((f) => ({ ...f, qp_url: '', ms_url: '', notes: '' }))
    }
  }

  const remove = async (p: PastPaper) => {
    if (!window.confirm(`Remove ${p.paper} · ${p.series} ${p.year}?`)) return
    const r = await deletePaper(p)
    if (r.error) setError(r.error)
    else setPapers((list) => list.filter((x) => x.id !== p.id))
  }

  return (
    <div className="papers">
      <div className="papers-head">
        <div>
          <h2 className="papers-title">Past papers</h2>
          <p className="papers-sub">
            {subject.name} · {board} · official question papers and mark schemes
          </p>
        </div>
        {canPost && (
          <button type="button" className="btn" onClick={() => setAdding((a) => !a)}>
            {adding ? 'Cancel' : 'Add paper'}
          </button>
        )}
      </div>

      {canPost && adding && (
        <form className="papers-form" onSubmit={submit}>
          <div className="papers-form-grid">
            <label className="pp-field">
              <span className="pp-label">Year</span>
              <input className="pp-input" type="number" min="2010" max="2100" value={form.year} onChange={set('year')} required />
            </label>
            <label className="pp-field">
              <span className="pp-label">Series</span>
              <select className="pp-input" value={form.series} onChange={set('series')}>
                {SERIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="pp-field">
              <span className="pp-label">Paper</span>
              <input className="pp-input" value={form.paper} onChange={set('paper')} placeholder="Paper 1" required />
            </label>
            <label className="pp-field">
              <span className="pp-label">Tier</span>
              <select className="pp-input" value={form.tier} onChange={set('tier')}>
                {TIERS.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pp-field pp-wide">
              <span className="pp-label">Question paper link</span>
              <input className="pp-input" type="url" value={form.qp_url} onChange={set('qp_url')} placeholder="https://…pdf" />
            </label>
            <label className="pp-field pp-wide">
              <span className="pp-label">Mark scheme link</span>
              <input className="pp-input" type="url" value={form.ms_url} onChange={set('ms_url')} placeholder="https://…pdf" />
            </label>
            <label className="pp-field pp-wide">
              <span className="pp-label">Notes (optional)</span>
              <input className="pp-input" value={form.notes} onChange={set('notes')} placeholder="e.g. Calculator paper" />
            </label>
          </div>
          <div className="papers-form-actions">
            <button type="submit" className="btn big" disabled={saving}>
              {saving ? 'Posting…' : 'Post paper'}
            </button>
            <span className="papers-form-hint">Link to the exam board’s own PDFs — nothing is re-hosted.</span>
          </div>
        </form>
      )}

      {hasTiers && (
        <div className="papers-filters" role="tablist" aria-label="Tier">
          {(['all', 'F', 'H'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={'chip' + (tier === t ? ' active' : '')}
              onClick={() => setTier(t)}
            >
              {t === 'all' ? 'All tiers' : tierLabel(t)}
            </button>
          ))}
        </div>
      )}

      {/* Raw storage errors are only useful to the owner; students just see the list. */}
      {error && canPost && <p className="papers-err">{error}</p>}
      {canPost && deviceOnly > 0 && (
        <p className="papers-note">
          {deviceOnly} {deviceOnly === 1 ? 'paper is' : 'papers are'} saved on this device only. Run{' '}
          <code>supabase-past-papers.sql</code> once to publish for everyone.
        </p>
      )}

      {loading ? (
        <p className="dash-empty">Loading…</p>
      ) : byYear.length === 0 ? (
        <div className="papers-empty">
          <p className="papers-empty-title">No past papers for {subject.name} yet.</p>
          <p className="papers-empty-sub">
            {canPost ? 'Post the first one with “Add paper”.' : 'They’ll appear here as soon as they’re posted.'}
          </p>
        </div>
      ) : (
        byYear.map(([year, list]) => (
          <section key={year} className="papers-year" aria-label={String(year)}>
            <h3 className="group-title">{year}</h3>
            <ul className="papers-list">
              {list.map((p) => (
                <li key={p.id} className="paper-row">
                  <div className="paper-main">
                    <span className="paper-name">{p.paper}</span>
                    {p.tier && <span className="paper-tier">{tierLabel(p.tier)}</span>}
                    <span className="paper-series">
                      {p.series} {p.year}
                    </span>
                    {p.local && <span className="paper-local">This device</span>}
                    {p.notes && <span className="paper-notes">{p.notes}</span>}
                  </div>
                  <div className="paper-links">
                    {p.qp_url && (
                      <a className="btn" href={p.qp_url} target="_blank" rel="noreferrer noopener">
                        Question paper ↗
                      </a>
                    )}
                    {p.ms_url && (
                      <a className="btn ghost" href={p.ms_url} target="_blank" rel="noreferrer noopener">
                        Mark scheme ↗
                      </a>
                    )}
                    {canPost && (
                      <button type="button" className="btn ghost paper-remove" onClick={() => remove(p)}>
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
