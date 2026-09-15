/* Grade Lab gamification engine.
   Two tracks, both DERIVED from real study activity so they can't be faked:
   - XP  → drives your Level and lab-themed Rank; the leaderboard sorts by XP.
   - Gradons (⚛️) → the spendable currency, earned alongside XP, spent in the Shop.

   Everything is computed from the same localStorage progress the app already
   keeps (flashcards, exam self-marks, quiz results), plus a small "game" blob
   that records what the player has bought/equipped and their quiz tallies. */

import { SUBJECTS, SUBJECT_ORDER, flattenCards } from './subjects.js'
import { questionSections } from './questions/index.js'

// The spendable currency. Rename here to rebrand everywhere.
export const CURRENCY = { name: 'Gems', one: 'Gem', icon: '💎' }

const GAME_KEY = 'gradelab-game-v1'
const cardKey = (id) => `gcse-flashcards-${id}-v1`
const examKey = (id) => `gradelab-exam-${id}-v1`
const quizSeenKey = (id) => `gradelab-quiz-seen-${id}-v1`

// How much each action is worth: { xp, c } where c = Gradons.
const RATE = {
  known: { xp: 10, c: 5 },
  learning: { xp: 2, c: 1 },
  examFull: { xp: 25, c: 12 },
  examPart: { xp: 12, c: 6 },
  examNone: { xp: 4, c: 2 },
  quizCorrect: { xp: 8, c: 4 },
  quizWrong: { xp: 2, c: 1 },
  badge: { xp: 100, c: 50 },
  perfect: { xp: 50, c: 25 },
}

const defaultGame = () => ({
  spent: 0,
  owned: [],
  equipped: { avatar: null, title: null, theme: null },
  quizAnswered: 0,
  quizCorrect: 0,
  perfectQuizzes: 0,
})

export function loadGame() {
  try {
    return { ...defaultGame(), ...(JSON.parse(localStorage.getItem(GAME_KEY)) || {}) }
  } catch {
    return defaultGame()
  }
}

export function saveGame(g) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(g))
  } catch {
    /* ignore */
  }
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

// What a finished quiz is worth (shown on the results screen). Mirrors the
// RATE table above, including the perfect-quiz bonus.
export function quizReward(correct, total) {
  const wrong = Math.max(0, total - correct)
  const perfect = total > 0 && correct === total
  return {
    xp: correct * RATE.quizCorrect.xp + wrong * RATE.quizWrong.xp + (perfect ? RATE.perfect.xp : 0),
    c: correct * RATE.quizCorrect.c + wrong * RATE.quizWrong.c + (perfect ? RATE.perfect.c : 0),
    perfect,
  }
}

// Record a finished quiz so quiz XP/Gradons and badges count.
export function recordQuiz(correct, total) {
  const g = loadGame()
  g.quizAnswered += total
  g.quizCorrect += correct
  if (total > 0 && correct === total) g.perfectQuizzes += 1
  saveGame(g)
  return g
}

// Gather every stat we award from, across all subjects.
export function readStats() {
  let known = 0
  let learning = 0
  let examFull = 0
  let examPart = 0
  let examNone = 0
  let seenQuiz = 0
  let subjectsWithKnown = 0

  SUBJECT_ORDER.forEach((id) => {
    const subject = SUBJECTS[id]
    if (!subject) return
    const prog = readJSON(cardKey(id))
    let subjKnown = 0
    flattenCards(subject).forEach((c) => {
      const v = prog[c.id]
      if (v === 'known') subjKnown++
      else if (v) learning++
    })
    known += subjKnown
    if (subjKnown > 0) subjectsWithKnown++

    const marks = readJSON(examKey(id))
    Object.values(marks).forEach((v) => {
      if (v === 'full') examFull++
      else if (v === 'part') examPart++
      else if (v === 'none') examNone++
    })

    try {
      const arr = JSON.parse(localStorage.getItem(quizSeenKey(id)))
      if (Array.isArray(arr)) seenQuiz += arr.length
    } catch {
      /* ignore */
    }
  })

  const g = loadGame()
  // Quiz "answered" counts recorded results, but also honours older history
  // (seen sets) so activity before this feature still rewards something.
  const quizAnswered = Math.max(g.quizAnswered, seenQuiz)
  const quizCorrect = g.quizCorrect
  const quizWrong = Math.max(0, quizAnswered - quizCorrect)

  return {
    known,
    learning,
    examFull,
    examPart,
    examNone,
    examAttempted: examFull + examPart + examNone,
    quizAnswered,
    quizCorrect,
    quizWrong,
    perfectQuizzes: g.perfectQuizzes,
    subjectsWithKnown,
    subjectsTotal: SUBJECT_ORDER.length,
    itemsOwned: g.owned.length,
  }
}

/* ---- Levels & ranks ---- */

// Smooth curve: each level needs a bit more XP than the last.
export function levelForXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1
}
export function xpForLevel(level) {
  return 50 * (level - 1) * (level - 1)
}

export const RANKS = [
  { min: 1, name: 'Bronze Beaker', icon: '🥉' },
  { min: 5, name: 'Silver Flask', icon: '🥈' },
  { min: 10, name: 'Gold Burner', icon: '🥇' },
  { min: 20, name: 'Platinum Prism', icon: '💎' },
  { min: 30, name: 'Diamond Scholar', icon: '🔬' },
]
export function rankForLevel(level) {
  let r = RANKS[0]
  for (const rank of RANKS) if (level >= rank.min) r = rank
  return r
}

/* ---- Badges (achievements). Each test(stats, game) → boolean. ---- */

export const BADGES = [
  { id: 'first-spark', icon: '✨', name: 'First Spark', desc: 'Mark your first flashcard as known.', test: (s) => s.known >= 1 },
  { id: 'quick-study', icon: '📚', name: 'Quick Study', desc: 'Know 25 flashcards.', test: (s) => s.known >= 25 },
  { id: 'centurion', icon: '💯', name: 'Centurion', desc: 'Know 100 flashcards.', test: (s) => s.known >= 100 },
  { id: 'card-shark', icon: '🦈', name: 'Card Shark', desc: 'Know 400 flashcards.', test: (s) => s.known >= 400 },
  { id: 'scholar', icon: '🎓', name: 'Scholar', desc: 'Know 1000 flashcards.', test: (s) => s.known >= 1000 },
  { id: 'exam-rookie', icon: '📝', name: 'Exam Rookie', desc: 'Attempt 10 exam questions.', test: (s) => s.examAttempted >= 10 },
  { id: 'top-marks', icon: '🏆', name: 'Top Marks', desc: 'Get full marks on 50 exam questions.', test: (s) => s.examFull >= 50 },
  { id: 'exam-boss', icon: '👑', name: 'Exam Boss', desc: 'Get full marks on 200 exam questions.', test: (s) => s.examFull >= 200 },
  { id: 'quiz-novice', icon: '🧠', name: 'Quiz Novice', desc: 'Answer 10 quiz questions.', test: (s) => s.quizAnswered >= 10 },
  { id: 'sharpshooter', icon: '🎯', name: 'Sharpshooter', desc: 'Score 100% on a quiz.', test: (s) => s.perfectQuizzes >= 1 },
  { id: 'quiz-master', icon: '⚡', name: 'Quiz Master', desc: 'Answer 100 quiz questions correctly.', test: (s) => s.quizCorrect >= 100 },
  { id: 'explorer', icon: '🧭', name: 'Explorer', desc: 'Learn cards in 3 different subjects.', test: (s) => s.subjectsWithKnown >= 3 },
  { id: 'polymath', icon: '🌈', name: 'Polymath', desc: 'Learn cards in every subject.', test: (s) => s.subjectsTotal > 0 && s.subjectsWithKnown >= s.subjectsTotal },
  { id: 'big-spender', icon: '🛍️', name: 'Big Spender', desc: 'Own 3 shop items.', test: (s) => s.itemsOwned >= 3 },
  { id: 'high-roller', icon: '🤑', name: 'High Roller', desc: 'Own 8 shop items.', test: (s) => s.itemsOwned >= 8 },
]

/* ---- The Shop ---- */

export const SHOP = [
  // Avatars (value = emoji shown instead of your initial)
  { id: 'av-owl', type: 'avatar', label: 'Wise Owl', value: '🦉', price: 150 },
  { id: 'av-rocket', type: 'avatar', label: 'Rocket', value: '🚀', price: 150 },
  { id: 'av-fox', type: 'avatar', label: 'Sly Fox', value: '🦊', price: 150 },
  { id: 'av-chem', type: 'avatar', label: 'Chemist', value: '🧪', price: 200 },
  { id: 'av-brain', type: 'avatar', label: 'Big Brain', value: '🧠', price: 250 },
  { id: 'av-blaze', type: 'avatar', label: 'Blaze', value: '🔥', price: 300 },
  { id: 'av-shark', type: 'avatar', label: 'Shark', value: '🦈', price: 300 },
  { id: 'av-goat', type: 'avatar', label: 'The GOAT', value: '🐐', price: 500 },
  { id: 'av-crown', type: 'avatar', label: 'Royalty', value: '👑', price: 700 },
  { id: 'av-alien', type: 'avatar', label: 'Galaxy Brain', value: '👽', price: 800 },
  // Titles (value = text shown under your name)
  { id: 'ti-scholar', type: 'title', label: 'The Scholar', value: 'The Scholar', price: 200 },
  { id: 'ti-nightowl', type: 'title', label: 'Night Owl', value: 'Night Owl', price: 200 },
  { id: 'ti-slayer', type: 'title', label: 'Exam Slayer', value: 'Exam Slayer', price: 400 },
  { id: 'ti-legend', type: 'title', label: 'Quiz Legend', value: 'Quiz Legend', price: 500 },
  { id: 'ti-straighta', type: 'title', label: "Straight A's", value: "Straight A's", price: 800 },
  { id: 'ti-genius', type: 'title', label: 'Certified Genius', value: 'Certified Genius', price: 1200 },
  // Themes (value = profile banner style key → CSS class pbanner-<value>)
  { id: 'th-aurora', type: 'theme', label: 'Aurora', value: 'aurora', price: 250 },
  { id: 'th-sunset', type: 'theme', label: 'Sunset', value: 'sunset', price: 300 },
  { id: 'th-neon', type: 'theme', label: 'Neon', value: 'neon', price: 350 },
  { id: 'th-galaxy', type: 'theme', label: 'Galaxy', value: 'galaxy', price: 500 },
  { id: 'th-gold', type: 'theme', label: 'Gold Rush', value: 'gold', price: 900 },
]

export const SHOP_CATEGORIES = [
  { type: 'avatar', label: 'Avatars', icon: '😎' },
  { type: 'title', label: 'Titles', icon: '🏷️' },
  { type: 'theme', label: 'Banners', icon: '🎨' },
]

export function shopItem(id) {
  return SHOP.find((i) => i.id === id) || null
}

/* ---- The one call the UI uses: compute the whole game state ---- */

export function computeGame() {
  const g = loadGame()
  const s = readStats()

  let xp = 0
  let earned = 0
  const add = (n, rate) => {
    xp += n * rate.xp
    earned += n * rate.c
  }
  add(s.known, RATE.known)
  add(s.learning, RATE.learning)
  add(s.examFull, RATE.examFull)
  add(s.examPart, RATE.examPart)
  add(s.examNone, RATE.examNone)
  add(s.quizCorrect, RATE.quizCorrect)
  add(s.quizWrong, RATE.quizWrong)
  add(s.perfectQuizzes, RATE.perfect)

  const badges = BADGES.map((b) => ({ ...b, unlocked: !!b.test(s, g) }))
  const unlockedCount = badges.filter((b) => b.unlocked).length
  add(unlockedCount, RATE.badge)

  const level = levelForXp(xp)
  const rank = rankForLevel(level)
  const base = xpForLevel(level)
  const nextAt = xpForLevel(level + 1)
  const levelProgress = nextAt > base ? Math.min(100, Math.round(((xp - base) / (nextAt - base)) * 100)) : 100

  const balance = Math.max(0, earned - g.spent)

  return {
    xp,
    level,
    rank,
    levelProgress,
    xpIntoLevel: xp - base,
    xpForNextLevel: nextAt - base,
    earned,
    balance,
    spent: g.spent,
    badges,
    unlockedCount,
    badgeTotal: BADGES.length,
    stats: s,
    game: g,
    equipped: g.equipped,
  }
}

/* ---- Mutations (return { ok, reason }); caller re-computes afterwards ---- */

export function buyItem(id) {
  const item = shopItem(id)
  if (!item) return { ok: false, reason: 'missing' }
  const c = computeGame()
  if (c.game.owned.includes(id)) return { ok: false, reason: 'owned' }
  if (c.balance < item.price) return { ok: false, reason: 'poor' }
  const g = loadGame()
  g.spent += item.price
  g.owned = [...g.owned, id]
  g.equipped = { ...g.equipped, [item.type]: id } // auto-equip on purchase
  saveGame(g)
  return { ok: true }
}

// Equip an owned item, or pass null to clear that slot back to default.
export function setEquipped(type, id) {
  const g = loadGame()
  if (id && !g.owned.includes(id)) return { ok: false, reason: 'not-owned' }
  g.equipped = { ...g.equipped, [type]: id }
  saveGame(g)
  return { ok: true }
}

// Resolve the currently equipped cosmetics to concrete values.
export function equippedAvatar(game) {
  const it = game?.equipped?.avatar ? shopItem(game.equipped.avatar) : null
  return it ? it.value : null
}
export function equippedTitle(game) {
  const it = game?.equipped?.title ? shopItem(game.equipped.title) : null
  return it ? it.value : null
}
export function equippedTheme(game) {
  const it = game?.equipped?.theme ? shopItem(game.equipped.theme) : null
  return it ? it.value : null
}
