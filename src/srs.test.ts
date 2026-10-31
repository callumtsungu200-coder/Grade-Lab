import { describe, expect, it } from 'vitest'
import { LADDER, dayNumber, dueCards, effectiveEntry, isDue, mergeSchedules, nextEntry } from './srs'

describe('dayNumber', () => {
  it('ignores the time of day', () => {
    expect(dayNumber(new Date(2026, 4, 1, 0, 5))).toBe(dayNumber(new Date(2026, 4, 1, 23, 55)))
  })
  it('counts consecutive days', () => {
    expect(dayNumber(new Date(2026, 4, 2)) - dayNumber(new Date(2026, 4, 1))).toBe(1)
  })
})

describe('nextEntry', () => {
  it('sends a "still learning" card back to tomorrow', () => {
    expect(nextEntry({ step: 4, due: 100 }, 'learning', 100)).toEqual({ step: 0, due: 101 })
  })
  it('climbs one rung when a due card is known', () => {
    expect(nextEntry({ step: 1, due: 100 }, 'known', 100)).toEqual({ step: 2, due: 100 + LADDER[2] })
  })
  it('leaves the schedule alone on an early review', () => {
    const prev = { step: 2, due: 110 }
    expect(nextEntry(prev, 'known', 105)).toBe(prev)
  })
  it('never climbs past the top of the ladder', () => {
    const top = LADDER.length - 1
    expect(nextEntry({ step: top, due: 100 }, 'known', 100)).toEqual({ step: top, due: 100 + LADDER[top] })
  })
  it('starts a brand-new known card on the first rung', () => {
    expect(nextEntry(null, 'known', 100)).toEqual({ step: 1, due: 100 + LADDER[1] })
  })
})

describe('effectiveEntry backfill', () => {
  it('makes old learning cards due on the anchor day', () => {
    expect(effectiveEntry('c1', 'learning', {}, 50)).toEqual({ step: 0, due: 50 })
  })
  it('spreads old known cards across the following fortnight', () => {
    const e = effectiveEntry('c1', 'known', {}, 50)!
    expect(e.due).toBeGreaterThan(50)
    expect(e.due).toBeLessThanOrEqual(64)
  })
  it('returns null for unseen cards', () => {
    expect(effectiveEntry('c1', undefined, {}, 50)).toBeNull()
    expect(isDue('c1', undefined, {}, 50, 999)).toBe(false)
  })
})

describe('dueCards', () => {
  it('orders most overdue first, learning before known on the same day', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const schedule = { a: { step: 2, due: 9 }, b: { step: 0, due: 9 }, c: { step: 1, due: 5 }, d: { step: 1, due: 20 } }
    const progress = { a: 'known', b: 'learning', c: 'known', d: 'known' }
    expect(dueCards(cards, progress, schedule, 0, 10).map((c) => c.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('mergeSchedules', () => {
  it('keeps the later review per card and the union of subjects', () => {
    const a = { bio: { x: { step: 1, due: 10 }, y: { step: 3, due: 40 } } }
    const b = { bio: { x: { step: 2, due: 15 }, y: { step: 1, due: 20 } }, chem: { z: { step: 0, due: 5 } } }
    expect(mergeSchedules(a, b)).toEqual({
      bio: { x: { step: 2, due: 15 }, y: { step: 3, due: 40 } },
      chem: { z: { step: 0, due: 5 } },
    })
  })
})
