/* Past papers — posted by the owner, readable by everyone.

   Source of truth is the Supabase table `past_papers` (see
   supabase-past-papers.sql). Everything fails soft: if Supabase isn't
   configured, or the table hasn't been created yet, papers are kept in
   localStorage on this device so the feature still works — the UI says
   so, so nothing silently pretends to be published. */

// @ts-expect-error — untyped JS module
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export type Tier = '' | 'F' | 'H'

export interface PastPaper {
  id: string
  subject: string
  board: string
  year: number
  series: string
  paper: string
  tier: Tier
  qp_url: string
  ms_url: string
  notes?: string
  created_at?: string
  /** true when the row only exists on this device */
  local?: boolean
}

export type NewPaper = Omit<PastPaper, 'id' | 'created_at' | 'local'>

const KEY = 'gradelab-past-papers-v1'

function loadLocal(): PastPaper[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveLocal(list: PastPaper[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function sortPapers(list: PastPaper[]): PastPaper[] {
  return [...list].sort(
    (a, b) => b.year - a.year || a.series.localeCompare(b.series) || a.paper.localeCompare(b.paper),
  )
}

function localId(): string {
  return 'local-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export async function fetchPapers(
  subject: string,
): Promise<{ data: PastPaper[]; source: 'cloud' | 'local'; error: string | null }> {
  const local = loadLocal().filter((p) => p.subject === subject)
  if (!isSupabaseConfigured || !supabase) {
    return { data: sortPapers(local), source: 'local', error: null }
  }
  const { data, error } = await supabase
    .from('past_papers')
    .select('id, subject, board, year, series, paper, tier, qp_url, ms_url, notes, created_at')
    .eq('subject', subject)
    .order('year', { ascending: false })
  if (error) {
    console.warn('fetchPapers error', error.message)
    return { data: sortPapers(local), source: 'local', error: error.message }
  }
  const cloud: PastPaper[] = (data || []).map((r: PastPaper) => ({ ...r, tier: (r.tier || '') as Tier }))
  // Keep device-only rows visible alongside the published ones.
  const localOnly = local.filter((p) => p.local)
  return { data: sortPapers([...cloud, ...localOnly]), source: 'cloud', error: null }
}

export async function addPaper(p: NewPaper): Promise<{ data: PastPaper | null; error: string | null }> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('past_papers')
      .insert({ ...p, tier: p.tier || null, notes: p.notes || null })
      .select('id, subject, board, year, series, paper, tier, qp_url, ms_url, notes, created_at')
      .single()
    if (!error && data) return { data: { ...data, tier: (data.tier || '') as Tier }, error: null }
    console.warn('addPaper error', error?.message)
    // Fall through to a device-only save so the owner's work isn't lost.
    const row: PastPaper = { ...p, id: localId(), local: true }
    saveLocal([row, ...loadLocal()])
    return { data: row, error: `Saved on this device only — ${error?.message ?? 'could not publish'}` }
  }
  const row: PastPaper = { ...p, id: localId(), local: true }
  saveLocal([row, ...loadLocal()])
  return { data: row, error: null }
}

export async function deletePaper(p: PastPaper): Promise<{ error: string | null }> {
  if (p.local || !isSupabaseConfigured || !supabase) {
    saveLocal(loadLocal().filter((x) => x.id !== p.id))
    return { error: null }
  }
  const { error } = await supabase.from('past_papers').delete().eq('id', p.id)
  if (error) {
    console.warn('deletePaper error', error.message)
    return { error: error.message }
  }
  return { error: null }
}
