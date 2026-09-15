import maths from './data/maths.js'
import biology from './data/biology.js'
import chemistry from './data/chemistry.js'
import physics from './data/physics.js'
import computerScience from './data/computer-science.js'
import mediaStudies from './data/media-studies.js'
import history from './data/history.js'
import englishLiterature from './data/english-literature.js'
import business from './data/business.js'
import citizenship from './data/citizenship.js'
import religiousStudies from './data/religious-studies.js'
import spanish from './data/spanish.js'

// Order the subjects appear in the switcher.
const MODULES = [
  maths,
  biology,
  chemistry,
  physics,
  computerScience,
  mediaStudies,
  history,
  englishLiterature,
  business,
  citizenship,
  religiousStudies,
  spanish,
]

export const SUBJECT_ORDER = MODULES.map((m) => m.id)
export const SUBJECTS = Object.fromEntries(MODULES.map((m) => [m.id, m]))

// Flatten a subject's topics into a list of cards with stable ids.
export function flattenCards(subject) {
  const out = []
  subject.topics.forEach((topic) => {
    topic.cards.forEach((c) => {
      out.push({
        id: topic.code + '|' + c[0],
        code: topic.code,
        topicName: topic.name,
        q: c[0],
        a: c[1],
        tier: c[2] || '',
      })
    })
  })
  return out
}
