import { describe, expect, it } from 'vitest'
import { SRS_KEY, hasProgress, mergeCloudBlob } from './progressSync'

describe('mergeCloudBlob', () => {
  it('unions subjects and cards, with the cloud winning on conflict', () => {
    const local = { biology: { a: 'known', b: 'learning' }, physics: { p: 'known' } }
    const cloud = { biology: { b: 'known', c: 'learning' } }
    expect(mergeCloudBlob(local, cloud)).toEqual({
      biology: { a: 'known', b: 'known', c: 'learning' },
      physics: { p: 'known' },
    })
  })

  it('merges spaced-repetition schedules instead of overwriting them', () => {
    const local = { [SRS_KEY]: { biology: { a: { step: 3, due: 40 } } } }
    const cloud = { [SRS_KEY]: { biology: { a: { step: 1, due: 10 }, b: { step: 0, due: 5 } } } }
    expect(mergeCloudBlob(local, cloud)[SRS_KEY]).toEqual({
      biology: { a: { step: 3, due: 40 }, b: { step: 0, due: 5 } },
    })
  })

  it('copes with an empty cloud row', () => {
    const local = { biology: { a: 'known' } }
    expect(mergeCloudBlob(local, undefined)).toEqual(local)
  })
})

describe('hasProgress', () => {
  it('ignores schedules on their own', () => {
    expect(hasProgress({ [SRS_KEY]: { biology: { a: { step: 1, due: 3 } } } })).toBe(false)
    expect(hasProgress({ biology: {} })).toBe(false)
    expect(hasProgress(null)).toBe(false)
  })
  it('is true once any card is marked', () => {
    expect(hasProgress({ biology: { a: 'learning' } })).toBe(true)
  })
})
