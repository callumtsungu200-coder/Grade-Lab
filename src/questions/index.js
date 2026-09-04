/* Registry of grade-separated exam-style question sets, keyed by subject id.
   Add a subject by importing its module and adding it to MODULES. */
import biology from './biology.js'
import chemistry from './chemistry.js'
import computerScience from './computer-science.js'
import mediaStudies from './media-studies.js'
import history from './history.js'
import englishLiterature from './english-literature.js'
import business from './business.js'
import religiousStudies from './religious-studies.js'
import citizenship from './citizenship.js'
import physics from './physics.js'
import maths from './maths.js'

const MODULES = [biology, chemistry, computerScience, mediaStudies, history, englishLiterature, business, religiousStudies, citizenship, physics, maths]

const BY_SUBJECT = Object.fromEntries(MODULES.map((m) => [m.subjectId, m.sections]))

export const GRADES = [4, 5, 6, 7, 8, 9]

// Sections (with their questions) for a subject, or {} if none yet.
export function questionSections(subjectId) {
  return BY_SUBJECT[subjectId] || {}
}

// True if a subject has any practice questions available.
export function hasQuestions(subjectId) {
  const s = BY_SUBJECT[subjectId]
  return !!s && Object.keys(s).length > 0
}

// Stable id for a question, used for self-mark tracking.
export function questionId(section, index, q) {
  return `${section}#${index}#g${q.g}`
}
