/* Free plan allowance.

   Anyone without full access (guests and unpaid accounts) can unlock up to
   FREE_SET_LIMIT "sets", and a set stays unlocked once chosen. A set is:
     cards:<subject>:<topicCode>   one flashcard deck (a subtopic)
     quiz:<subject>:<section>      quizzes scoped to one section
     exam:<subject>:<section>      one exam-question section

   Stored on the device (localStorage). Full access ignores all of this. */

import { useEffect, useState } from 'react'

export const FREE_SET_LIMIT = 5

const KEY = 'gradelab-free-sets-v1'
const EVENT = 'gradelab:free-sets'

export type SetKind = 'cards' | 'quiz' | 'exam'

export const setKey = {
  cards: (subject: string, topicCode: string) => `cards:${subject}:${topicCode}`,
  quiz: (subject: string, section: string) => `quiz:${subject}:${section}`,
  exam: (subject: string, section: string) => `exam:${subject}:${section}`,
}

function load(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(arr) ? arr.filter((k) => typeof k === 'string') : []
  } catch {
    return []
  }
}

function save(keys: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore */
  }
}

export function unlockedSets(): string[] {
  return load()
}

export function isSetUnlocked(key: string): boolean {
  return load().includes(key)
}

export function freeSetsUsed(): number {
  return load().length
}

export function freeSetsLeft(): number {
  return Math.max(0, FREE_SET_LIMIT - freeSetsUsed())
}

/** Spend one of the free sets on `key`. Returns false if none are left. */
export function unlockSet(key: string): boolean {
  const keys = load()
  if (keys.includes(key)) return true
  if (keys.length >= FREE_SET_LIMIT) return false
  save([...keys, key])
  return true
}

/** Re-renders the caller whenever the allowance changes. */
export function useFreeSets(): { used: number; left: number; limit: number; isUnlocked: (key: string) => boolean } {
  const [keys, setKeys] = useState<string[]>(load)
  useEffect(() => {
    const refresh = () => setKeys(load())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return {
    used: keys.length,
    left: Math.max(0, FREE_SET_LIMIT - keys.length),
    limit: FREE_SET_LIMIT,
    isUnlocked: (key: string) => keys.includes(key),
  }
}
