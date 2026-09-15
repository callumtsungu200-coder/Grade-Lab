/* Free plan allowance.

   Anyone without full access (guests and unpaid accounts) can unlock up to
   FREE_SET_LIMIT "sets", and a set stays unlocked once chosen. A set is:
     cards:<subject>:<topicCode>   one flashcard deck (a subtopic)
     quiz:<subject>:<section>      quizzes scoped to one section
     exam:<subject>:<section>      one exam-question section

   Stored on the device (localStorage). When signed in, the account's list in
   Supabase (`free_sets`, see supabase-free-sets.sql) is the source of truth:
   it follows the account across devices and can't be reset by clearing
   browser data. If that table hasn't been created yet, everything falls back
   to device-only. Full access ignores all of this. */

import { useEffect, useState } from 'react'
// @ts-expect-error — untyped JS module
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

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

/* -------------------------------------------------------- Account (cloud) */

let accountId: string | null = null

/** Signed in: add this device's sets to the account (the server enforces the
    limit), then mirror the account's list locally. Fails soft. */
export async function attachAccount(userId: string): Promise<void> {
  accountId = userId
  if (!isSupabaseConfigured || !supabase) return
  try {
    const { data, error } = await supabase.rpc('sync_free_sets', { local_keys: load() })
    if (error) {
      console.warn('sync_free_sets', error.message)
      return
    }
    if (accountId === userId && Array.isArray(data)) save(data)
  } catch (e) {
    console.warn('sync_free_sets failed', e)
  }
}

export function detachAccount(): void {
  accountId = null
}

async function refreshFromAccount(): Promise<void> {
  if (!accountId || !supabase) return
  try {
    const { data } = await supabase.from('free_sets').select('sets').eq('id', accountId).maybeSingle()
    if (data && Array.isArray(data.sets)) save(data.sets)
  } catch {
    /* ignore */
  }
}

/** Spend a free set on `key`. Signed in, the server has the final say — the
    allowance may already have been used on another device. */
export async function claimSet(key: string): Promise<boolean> {
  const keys = load()
  if (keys.includes(key)) return true
  if (!accountId || !isSupabaseConfigured || !supabase) return unlockSet(key)
  if (keys.length >= FREE_SET_LIMIT) return false
  try {
    const { data, error } = await supabase.rpc('claim_free_set', { set_key: key })
    if (error) {
      if (error.code === 'P0001' || /limit/i.test(error.message || '')) {
        await refreshFromAccount()
        return false
      }
      console.warn('claim_free_set', error.message)
      return unlockSet(key) // table/function not set up yet → device-only
    }
    if (Array.isArray(data)) save(data)
    return load().includes(key)
  } catch (e) {
    console.warn('claim_free_set failed', e)
    return unlockSet(key)
  }
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
