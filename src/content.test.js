/* Content checks: every deck and question set is well-formed, so a typo in
   one of the big data files fails CI instead of showing a blank card. */
import { describe, expect, it } from 'vitest'
import { SUBJECTS, SUBJECT_ORDER, flattenCards } from './subjects.js'
import { questionSections } from './questions/index.js'

describe.each(SUBJECT_ORDER)('%s', (id) => {
  const subject = SUBJECTS[id]

  it('has a name and at least one topic', () => {
    expect(subject.name).toBeTruthy()
    expect(subject.topics.length).toBeGreaterThan(0)
  })

  it('has a question and an answer on every card', () => {
    const bad = flattenCards(subject).filter((c) => !String(c.q).trim() || !String(c.a).trim())
    expect(bad.map((c) => c.id)).toEqual([])
  })

  it('gives every card a unique id, so progress cannot collide', () => {
    const ids = flattenCards(subject).map((c) => c.id)
    const dupes = ids.filter((x, i) => ids.indexOf(x) !== i)
    expect([...new Set(dupes)]).toEqual([])
  })

  it('has a grade between 4 and 9 on every practice question', () => {
    for (const questions of Object.values(questionSections(id))) {
      for (const q of questions) expect([4, 5, 6, 7, 8, 9]).toContain(q.g)
    }
  })
})
