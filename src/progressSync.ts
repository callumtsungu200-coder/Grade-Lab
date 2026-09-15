/* Cloud progress blob merging — kept pure so it can be tested.

   Blob shape (one row per user in `user_progress.progress`):
     { "<subjectId>": { "<cardId>": "known" | "learning" }, ...,
       "__srs": { "<subjectId>": { "<cardId>": { step, due } } } }

   Rules (unchanged from the original in-component merge, plus schedules):
   - union of subjects; within a subject, union of card marks, cloud wins on conflict
   - spaced-repetition schedules: per card, the most recently reviewed entry wins */

import { mergeSchedules } from './srs'
import type { Schedule } from './srs'

export const SRS_KEY = '__srs'

export type ProgressMap = Record<string, string>
export type CloudBlob = Record<string, ProgressMap | Record<string, Schedule>>

export function mergeCloudBlob(local: CloudBlob = {}, cloud: CloudBlob = {}): CloudBlob {
  const merged: CloudBlob = {}
  for (const [sid, obj] of Object.entries(local)) if (sid !== SRS_KEY) merged[sid] = obj
  for (const [sid, obj] of Object.entries(cloud || {})) {
    if (sid === SRS_KEY) continue
    merged[sid] = { ...((local[sid] as ProgressMap) || {}), ...((obj as ProgressMap) || {}) }
  }
  const srs = mergeSchedules(
    (local[SRS_KEY] as Record<string, Schedule>) || {},
    ((cloud || {})[SRS_KEY] as Record<string, Schedule>) || {},
  )
  if (Object.keys(srs).length) merged[SRS_KEY] = srs
  return merged
}

/** True when the blob carries no card marks at all (schedules alone don't count). */
export function hasProgress(blob: CloudBlob | null | undefined): boolean {
  if (!blob) return false
  return Object.entries(blob).some(([k, v]) => k !== SRS_KEY && v && Object.keys(v).length > 0)
}
