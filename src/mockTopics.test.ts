import { describe, expect, it } from 'vitest'
import { MOCK_SECTIONS, MOCK_SUBJECT_ID, hasMockPage } from './mockTopics'
import { SUBJECTS, flattenCards } from './subjects.js'

describe('hasMockPage', () => {
  it('shows the page to the listed account on Computer Science, ignoring case', () => {
    expect(hasMockPage('cctsungu@gmail.com', 'computer-science')).toBe(true)
    expect(hasMockPage('CCTsungu@Gmail.com', 'computer-science')).toBe(true)
  })

  it('hides it on other subjects and from other accounts', () => {
    expect(hasMockPage('cctsungu@gmail.com', 'biology')).toBe(false)
    expect(hasMockPage('someone@example.com', 'computer-science')).toBe(false)
    expect(hasMockPage(null, 'computer-science')).toBe(false)
  })
})

describe('MOCK_SECTIONS', () => {
  const ids = new Set(flattenCards(SUBJECTS[MOCK_SUBJECT_ID]).map((c: { id: string }) => c.id))

  it('only points at flashcards that exist', () => {
    const missing = MOCK_SECTIONS.flatMap((s) => s.cards).filter((id) => !ids.has(id))
    expect(missing).toEqual([])
  })

  it('has unique point ids within each section', () => {
    for (const s of MOCK_SECTIONS) {
      const pointIds = s.points.map((p) => p.id)
      expect(new Set(pointIds).size).toBe(pointIds.length)
    }
  })
})
