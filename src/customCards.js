/* User-created flashcards, stored per subject in localStorage.
   These are separate from the built-in cards — users can add and remove
   their OWN cards only; the built-in deck is never editable. */
const key = (subjectId) => `gradelab-custom-${subjectId}-v1`

export const CUSTOM_CODE = 'MINE'

export function loadCustom(subjectId) {
  try {
    const arr = JSON.parse(localStorage.getItem(key(subjectId)))
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveCustom(subjectId, cards) {
  try {
    localStorage.setItem(key(subjectId), JSON.stringify(cards))
  } catch {
    /* ignore */
  }
}

// Custom cards flattened into the same shape as built-in cards for studying.
// Each card carries the subtopic code it was filed under (falls back to MINE).
export function customToCards(custom) {
  return custom.map((c) => ({
    id: c.id,
    code: c.code || CUSTOM_CODE,
    topicName: c.topicName || 'My flashcards',
    q: c.q,
    a: c.a,
    tier: '',
    custom: true,
  }))
}
