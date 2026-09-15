import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SUBJECTS, SUBJECT_ORDER, flattenCards } from './subjects.js'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import { PageTransition } from './ui/motion'
import PastPapersView from './components/PastPapersView'
import UnlockSetModal from './components/UnlockSetModal.jsx'
import { setKey, isSetUnlocked, useFreeSets, attachAccount, detachAccount, claimSet } from './freeSets'
import { logActivity } from './activity'
import { dayNumber, dueCards, gatherSchedules, getAnchor, loadSchedule, recordReview, writeSchedules } from './srs'
import { SRS_KEY, hasProgress, mergeCloudBlob } from './progressSync'
import TopicsView from './components/TopicsView.jsx'
import StudyView from './components/StudyView.jsx'
import Toast from './components/Toast.jsx'
import Gate from './components/Gate.jsx'
import AuthGate from './components/AuthGate.jsx'
import Paywall from './components/Paywall.jsx'
import WelcomeSplash from './components/WelcomeSplash.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import Profile from './components/Profile.jsx'
import Shop from './components/Shop.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import Landing from './components/Landing.jsx'
import QuestionsView from './components/QuestionsView.jsx'
import QuizView from './components/QuizView.jsx'
import DeckComplete from './components/DeckComplete.jsx'
import { getSetting, setSetting } from './settings.js'
import { hasQuestions } from './questions/index.js'
import { loadCustom, saveCustom, customToCards } from './customCards.js'
import { randomQuote } from './quotes.js'
import { AUTH_KEY } from './auth.js'
import { computeGame, equippedAvatar, recordQuiz, CURRENCY } from './gamification.js'
import { isSupabaseConfigured, supabase, fetchCloudProgress, saveCloudProgress, fetchPaid, upsertLeaderboard, deleteOwnAccount } from './supabaseClient.js'
import { OWNER_EMAILS, SUPPORT_EMAIL, STRIPE_PORTAL_LINK, NAME_OVERRIDES } from './supabaseConfig.js'

// Gather every subject's progress from localStorage into one object for the cloud.
function gatherLocalProgress() {
  const all = {}
  SUBJECT_ORDER.forEach((id) => {
    try {
      const raw = localStorage.getItem(`gcse-flashcards-${id}-v1`)
      if (raw) all[id] = JSON.parse(raw)
    } catch {
      /* ignore */
    }
  })
  return all
}

// Progress plus spaced-repetition schedules, as stored in the cloud row.
function gatherCloudBlob() {
  const blob = gatherLocalProgress()
  const srs = gatherSchedules(SUBJECT_ORDER)
  if (Object.keys(srs).length) blob[SRS_KEY] = srs
  return blob
}

// Write a merged cloud blob back into this browser.
function writeCloudBlob(blob) {
  Object.entries(blob).forEach(([sid, obj]) => {
    if (sid === SRS_KEY) {
      writeSchedules(obj)
      return
    }
    try {
      localStorage.setItem(`gcse-flashcards-${sid}-v1`, JSON.stringify(obj))
    } catch {
      /* ignore */
    }
  })
}

const LAST_KEY = 'gcse-flashcards-last-subject'
const storeKey = (id) => `gcse-flashcards-${id}-v1`

// Short relative time for the "Saved 2m ago" label.
function relTime(at) {
  if (!at) return ''
  const s = Math.floor((Date.now() - at) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function loadProgress(id) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(id))) || {}
  } catch {
    return {}
  }
}

function initialSubject() {
  try {
    const last = localStorage.getItem(LAST_KEY)
    if (last && SUBJECTS[last]) return last
  } catch {
    /* ignore */
  }
  return SUBJECT_ORDER[0]
}

function initialAccess() {
  try {
    if (localStorage.getItem(AUTH_KEY) === 'ok') return 'full'
  } catch {
    /* ignore */
  }
  return 'locked' // 'locked' | 'full' | 'demo'
}

export default function App() {
  const [access, setAccess] = useState(initialAccess)
  const [subjectId, setSubjectId] = useState(initialSubject)
  const [progress, setProgress] = useState(() => loadProgress(initialSubject()))
  // Data-safety refs (see the sync hotfix):
  // - subjectIdRef: the live subject id, for async callbacks that would
  //   otherwise capture a stale one.
  // - progressOwnerRef: which subject the in-memory `progress` belongs to; the
  //   persist effect refuses to write one subject's marks under another's key.
  // - syncedUserRef: the user already merged with the cloud this page session.
  const subjectIdRef = useRef(subjectId)
  subjectIdRef.current = subjectId
  const progressOwnerRef = useRef(subjectId)
  const syncedUserRef = useRef(null)
  const [view, setView] = useState('topics') // 'topics' | 'study'
  const [hideHT, setHideHT] = useState(false)
  const [hideOnly, setHideOnly] = useState(false)
  const [mode, setMode] = useState('all')
  const [session, setSession] = useState({ topicCode: null, cards: [], index: 0 })
  const [flipped, setFlipped] = useState(false)
  const [toast, setToast] = useState(null)
  const [deckDone, setDeckDone] = useState(null) // { count } while the celebration shows
  const celebratedRef = useRef(false) // guard: celebrate a deck only once per session
  const syncedRef = useRef(false) // true once the initial cloud→local sync has finished
  const [syncState, setSyncState] = useState({ status: 'idle', at: null }) // 'idle'|'saving'|'saved'|'error'
  const [nowTick, setNowTick] = useState(0) // ticks so the "saved 2m ago" label stays fresh
  const [user, setUser] = useState(null) // Supabase auth user (null if not logged in)
  const [paid, setPaid] = useState(false) // has this user paid for access?
  const [checkingPaid, setCheckingPaid] = useState(false)
  const [recovery, setRecovery] = useState(false) // password-reset flow in progress

  const [paywallOpen, setPaywallOpen] = useState(false) // paywall popup — opened on demand, never on login
  const [contactOpen, setContactOpen] = useState(false) // contact popup
  const [welcome, setWelcome] = useState(null) // { name, quote } shown right after login
  const [adminOpen, setAdminOpen] = useState(true) // owner sees the dashboard first
  const [contentMode, setContentMode] = useState('cards') // 'cards' | 'exam'
  const [profileOpen, setProfileOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [gameTick, setGameTick] = useState(0)
  // Dark-only — the theme picker has been retired. Left as a constant so
  // any downstream reads of `theme` keep working without a rewrite.
  const theme = 'dark'
  const [custom, setCustom] = useState(() => loadCustom(initialSubject()))
  const [mineOnly, setMineOnly] = useState(false) // show only the user's own cards
  const [showAuth, setShowAuth] = useState(false) // landing → auth
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [page, setPage] = useState('dashboard') // 'dashboard' | 'subject'
  const [activityTick, setActivityTick] = useState(0) // bumps when the activity log changes
  const [guestName, setGuestName] = useState(() => {
    try {
      return localStorage.getItem('gradelab-guest-name') || ''
    } catch {
      return ''
    }
  })

  // Owner accounts always have access; so do anyone who has paid.
  // Dev-only: `localStorage.setItem('gradelab-dev-owner', '1')` under
  // `npm run dev` simulates the owner account (full access, owner tools)
  // so those paths can be previewed without Supabase. Dead code in builds.
  const devOwner = import.meta.env.DEV && localStorage.getItem('gradelab-dev-owner') === '1'
  const isOwner =
    (!!user && OWNER_EMAILS.map((e) => e.toLowerCase()).includes((user.email || '').toLowerCase())) || devOwner
  const displayName = (() => {
    if (user) {
      // A name the user set themselves (user_metadata) wins; then any hardcoded
      // override; then the email as a last resort.
      const o = NAME_OVERRIDES[(user.email || '').toLowerCase()]
      const fn = user.user_metadata?.first_name || o?.first
      const ln = user.user_metadata?.last_name ?? o?.last
      if (fn) return `${fn}${ln ? ' ' + ln : ''}`
      return user.email
    }
    if (guestName.trim()) return guestName.trim()
    return access === 'demo' ? 'Guest' : 'You'
  })()
  const hasAccess = paid || isOwner

  // Free plan: guests and unpaid accounts can unlock FREE_SET_LIMIT sets
  // (a flashcard deck, a quiz section or an exam section each). Progress
  // for those sets is saved on this device.
  const isFree = !hasAccess
  const freeSets = useFreeSets()
  const [setRequest, setSetRequest] = useState(null) // { key, label, kind, premiumOnly? }
  const pendingSetRef = useRef(null) // continuation to run once a set is unlocked

  const subject = SUBJECTS[subjectId]
  const allCards = useMemo(() => [...flattenCards(subject), ...customToCards(custom)], [subject, custom])
  const hasHT = useMemo(() => allCards.some((c) => c.tier.includes('HT')), [allCards])
  const hasOnly = useMemo(
    () => allCards.some((c) => c.tier.includes(subject.onlyCode)),
    [allCards, subject],
  )

  const visibleByTier = useCallback(
    (card) => {
      if (hideHT && card.tier.includes('HT')) return false
      if (hideOnly && card.tier.includes(subject.onlyCode)) return false
      return true
    },
    [hideHT, hideOnly, subject],
  )

  // Dark-only: pin data-theme once. No toggle exposed.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  // Mobile drawer hygiene: close on Escape, and when the viewport grows
  // past the breakpoint (the persistent sidebar takes over there).
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
    const mq = window.matchMedia('(min-width: 901px)')
    const onChange = (e) => { if (e.matches) setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onChange)
    }
  }, [sidebarOpen])

  // Reflect the active subject on the root element so CSS can theme the accent.
  useEffect(() => {
    document.documentElement.setAttribute('data-subject', subjectId)
    try {
      localStorage.setItem(LAST_KEY, subjectId)
    } catch {
      /* ignore */
    }
  }, [subjectId])

  // Persist progress whenever it changes — on this device for everyone;
  // the cloud copy is a full-access feature (see pushProgress).
  useEffect(() => {
    // Never write one subject's marks under another subject's key.
    if (progressOwnerRef.current !== subjectId) return
    try {
      localStorage.setItem(storeKey(subjectId), JSON.stringify(progress))
    } catch {
      /* ignore */
    }
  }, [progress, subjectId])

  const showToast = useCallback((msg) => {
    setToast({ msg, at: Date.now() })
  }, [])

  // Called when the user finishes a whole deck. Shows the cinematic celebration
  // (once per session) unless they've turned it off — otherwise a quiet toast.
  const finishDeck = useCallback(
    (count) => {
      if (celebratedRef.current) return
      celebratedRef.current = true
      if (getSetting('deckCelebration')) {
        setDeckDone({ count })
      } else {
        showToast('Deck complete 🎉')
      }
    },
    [showToast],
  )

  // Merge a user's cloud progress with whatever is in this browser, then keep the
  // union. This runs before any upload is allowed (syncedRef), so we can never
  // clobber saved progress with an empty/stale local copy on login.
  const syncFromCloud = useCallback(async (u) => {
    if (!u) return
    const cloud = await fetchCloudProgress(u.id)
    const local = gatherCloudBlob()
    const cloudHas = cloud && Object.keys(cloud).length

    if (cloudHas) {
      // Union of subjects; within a subject, union of card marks (cloud wins on
      // conflict); spaced-repetition schedules keep the latest review per card.
      const merged = mergeCloudBlob(local, cloud)
      writeCloudBlob(merged)
      // Reload whichever subject is open NOW — not the one open when this
      // callback was created.
      const current = subjectIdRef.current
      progressOwnerRef.current = current
      setProgress(loadProgress(current))
      // Push the merged result back so the cloud gains any local-only marks.
      saveCloudProgress(u.id, merged)
      setSyncState({ status: 'saved', at: Date.now() })
      showToast('Progress synced')
    } else if (hasProgress(local)) {
      // Cloud empty but we have local progress — seed the cloud from it.
      saveCloudProgress(u.id, local)
      setSyncState({ status: 'saved', at: Date.now() })
    }
    // Only now is it safe to let the debounced uploader run.
    syncedRef.current = true
  }, [showToast])

  // Re-check whether the user has paid (used after returning from Stripe).
  const refreshPaid = useCallback(async () => {
    if (!user) return
    setCheckingPaid(true)
    const p = await fetchPaid(user.id)
    setPaid(p)
    setCheckingPaid(false)
    if (!p) showToast('No payment found yet — it can take a few seconds.')
  }, [user, showToast])

  // Watch the Supabase auth session (only when configured).
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const handle = (u) => {
      setUser(u)
      if (u) {
        fetchPaid(u.id).then(setPaid)
        // Supabase re-announces the session on every tab/app focus and every
        // token refresh. Merge with the cloud only once per user per page
        // session; the debounced uploader keeps the cloud current after that.
        if (syncedUserRef.current !== u.id) {
          syncedUserRef.current = u.id
          syncFromCloud(u)
          attachAccount(u.id)
        }
      } else {
        setPaid(false)
        syncedRef.current = false
        syncedUserRef.current = null
        detachAccount()
      }
    }
    supabase.auth.getSession().then(({ data }) => handle(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_IN' && sess?.user) {
        const u = sess.user
        let seen = null
        try { seen = sessionStorage.getItem('gl-welcomed') } catch { /* ignore */ }
        if (seen !== u.id) {
          try { sessionStorage.setItem('gl-welcomed', u.id) } catch { /* ignore */ }
          const override = NAME_OVERRIDES[(u.email || '').toLowerCase()]
          const first = override?.first || u.user_metadata?.first_name || (u.email ? u.email.split('@')[0] : '')
          setWelcome({ name: first, quote: randomQuote() })
        }
      }
      handle(sess?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Upload the current progress to the cloud and report the outcome so the UI can
  // show a live "Saved" status. Returns the save result.
  const pushProgress = useCallback(async () => {
    if (!isSupabaseConfigured || !user) return { ok: false }
    if (!Object.keys(gatherLocalProgress()).length) return { ok: false, empty: true }
    const blob = gatherCloudBlob()
    setSyncState((s) => ({ status: 'saving', at: s.at }))
    const res = await saveCloudProgress(user.id, blob)
    if (res && res.ok) setSyncState({ status: 'saved', at: Date.now() })
    else if (res && res.error) setSyncState((s) => ({ status: 'error', at: s.at }))
    return res || { ok: false }
  }, [user])

  // Manual "Back up now" — force an immediate upload.
  const backupNow = useCallback(async () => {
    const res = await pushProgress()
    if (res.ok) showToast('Progress backed up ✓')
    else if (res.empty) showToast('Nothing to back up yet — study a few cards first.')
    else showToast('Backup failed — check your connection and try again.')
  }, [pushProgress, showToast])

  // Debounced push of all progress to the cloud whenever it changes (only if logged in).
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    // Never upload before the initial download/merge has run — that would wipe
    // saved progress with an empty/stale local copy.
    if (!syncedRef.current) return
    if (!Object.keys(gatherLocalProgress()).length) return
    const t = setTimeout(() => pushProgress(), 800)
    return () => clearTimeout(t)
  }, [progress, subjectId, user, pushProgress])

  // Keep the "saved 2m ago" label fresh.
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const unlock = useCallback(() => {
    try {
      localStorage.setItem(AUTH_KEY, 'ok')
    } catch {
      /* ignore */
    }
    setAccess('full')
  }, [])
  const enterDemo = useCallback(() => {
    setWelcome((w) => w || { name: 'Guest', quote: randomQuote() })
    setShowAuth(false)
    setAccess('demo')
  }, [])
  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch {
        /* ignore */
      }
      setUser(null)
      setPaid(false)
    }
    try { sessionStorage.removeItem('gl-welcomed') } catch { /* ignore */ }
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch {
      /* ignore */
    }
    setAccess('locked')
  }, [])

  // Self-service account deletion. On success we sign the user out (which returns
  // them to the landing page). Returns { ok, error } so the modal can show errors.
  const handleDeleteAccount = useCallback(async () => {
    const res = await deleteOwnAccount()
    if (res.ok) {
      setProfileOpen(false)
      await signOut()
      showToast('Your account has been deleted.')
    }
    return res
  }, [signOut, showToast])

  const switchSubject = useCallback((id) => {
    if (!SUBJECTS[id]) return
    setSubjectId(id)
    progressOwnerRef.current = id
    setProgress(loadProgress(id))
    setCustom(loadCustom(id))
    setView('topics')
    setHideHT(false)
    setHideOnly(false)
    setMode('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const collectCards = useCallback(
    (topicCode) =>
      allCards.filter(
        (c) =>
          (topicCode === 'ALL' || c.code === topicCode) &&
          visibleByTier(c) &&
          (!mineOnly || c.custom),
      ),
    [allCards, visibleByTier, mineOnly],
  )

  const applyMode = useCallback(
    (list, m) => {
      if (m === 'all') return list
      return list.filter((c) => {
        const st = progress[c.id]
        if (m === 'learning') return st !== 'known'
        if (m === 'unseen') return !st
        if (m === 'known') return st === 'known'
        return true
      })
    },
    [progress],
  )

  // Spaced repetition: this subject's cards due for review today.
  // Free plan: only decks the user has unlocked (and their own cards).
  const dueNow = useMemo(() => {
    const allowed = allCards.filter(
      (c) => visibleByTier(c) && (!isFree || c.custom || freeSets.isUnlocked(setKey.cards(subjectId, c.code))),
    )
    return dueCards(allowed, progress, loadSchedule(subjectId), getAnchor(), dayNumber())
    // activityTick re-reads schedules after every mark; freeSets.used after an unlock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCards, visibleByTier, progress, subjectId, isFree, freeSets.used, activityTick])

  const startSession = useCallback(
    (topicCode) => {
      const cards = topicCode === 'DUE' ? dueNow : applyMode(collectCards(topicCode), mode)
      celebratedRef.current = false
      setSession({ topicCode, cards, index: 0 })
      setFlipped(false)
      setView('study')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [applyMode, collectCards, mode, dueNow],
  )

  const goTopics = useCallback(() => setView('topics'), [])

  const next = useCallback(() => {
    setSession((s) => {
      if (s.index < s.cards.length - 1) {
        setFlipped(false)
        return { ...s, index: s.index + 1 }
      }
      if (s.cards.length > 0) finishDeck(s.cards.length)
      return s
    })
  }, [finishDeck])

  const prev = useCallback(() => {
    setSession((s) => {
      if (s.index > 0) {
        setFlipped(false)
        return { ...s, index: s.index - 1 }
      }
      return s
    })
  }, [])

  const mark = useCallback(
    (status) => {
      // Log outside the state updater so StrictMode's double-invoke can't
      // record the same mark twice.
      const cur = session.cards[session.index]
      if (cur) {
        recordReview(subjectId, cur.id, status, progress[cur.id])
        logActivity({ t: status, s: subjectId, c: cur.code })
        setActivityTick((t) => t + 1)
      }
      setSession((s) => {
        const card = s.cards[s.index]
        if (!card) return s
        const nextProgress = { ...progress, [card.id]: status }
        setProgress(nextProgress)

        if (mode !== 'all' && s.topicCode !== 'DUE') {
          // Rebuild the filtered list, trying to keep our place.
          const base = allCards.filter(
            (c) => (s.topicCode === 'ALL' || c.code === s.topicCode) && visibleByTier(c),
          )
          const rebuilt = base.filter((c) => {
            const st = nextProgress[c.id]
            if (mode === 'learning') return st !== 'known'
            if (mode === 'unseen') return !st
            if (mode === 'known') return st === 'known'
            return true
          })
          if (rebuilt.length === 0) {
            finishDeck(base.length)
            return { ...s, cards: [], index: 0 }
          }
          let idx = rebuilt.findIndex((c) => c.id === card.id)
          if (idx === -1) idx = Math.min(s.index, rebuilt.length - 1)
          setFlipped(false)
          return { ...s, cards: rebuilt, index: idx }
        }

        if (s.index < s.cards.length - 1) {
          setFlipped(false)
          return { ...s, index: s.index + 1 }
        }
        finishDeck(s.cards.length)
        return s
      })
    },
    [allCards, mode, progress, visibleByTier, finishDeck, session, subjectId],
  )

  const shuffle = useCallback(() => {
    setSession((s) => {
      const cards = [...s.cards]
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[cards[i], cards[j]] = [cards[j], cards[i]]
      }
      return { ...s, cards, index: 0 }
    })
    setFlipped(false)
    showToast('Shuffled')
  }, [showToast])

  const changeMode = useCallback(
    (m) => {
      setMode(m)
      setSession((s) => ({
        ...s,
        cards: (() => {
          if (s.topicCode === 'DUE') return s.cards // a review queue isn't re-filtered
          const base = allCards.filter(
            (c) => (s.topicCode === 'ALL' || c.code === s.topicCode) && visibleByTier(c),
          )
          if (m === 'all') return base
          return base.filter((c) => {
            const st = progress[c.id]
            if (m === 'learning') return st !== 'known'
            if (m === 'unseen') return !st
            if (m === 'known') return st === 'known'
            return true
          })
        })(),
        index: 0,
      }))
      setFlipped(false)
    },
    [allCards, progress, visibleByTier],
  )

  const resetSubject = useCallback(() => {
    if (
      window.confirm(
        `Reset your progress for ${subject.name}? This clears every mark for this subject only.`,
      )
    ) {
      setProgress({})
      showToast(`${subject.name} progress reset`)
    }
  }, [subject, showToast])

  const addCustomCard = useCallback((q, a, code, topicName) => {
    const question = (q || '').trim()
    const answer = (a || '').trim()
    if (!question || !answer) return
    const card = {
      id: `MINE|${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      q: question,
      a: answer,
      code: code || 'MINE',
      topicName: topicName || 'My flashcards',
    }
    setCustom((cur) => {
      const next = [...cur, card]
      saveCustom(subjectId, next)
      return next
    })
    showToast('Card added')
  }, [subjectId, showToast])

  // Let the user rename themselves. Logged-in users save to their Supabase
  // account (syncs across devices); guests save to this browser.
  const saveName = useCallback(
    async (raw) => {
      const name = (raw || '').trim().slice(0, 40)
      if (!name) return
      if (user && isSupabaseConfigured) {
        const [first, ...rest] = name.split(/\s+/)
        const last = rest.join(' ')
        const { data, error } = await supabase.auth.updateUser({
          data: { first_name: first, last_name: last },
        })
        if (error) {
          showToast('Could not update name — try again.')
          return
        }
        if (data?.user) setUser(data.user)
      } else {
        setGuestName(name)
        try {
          localStorage.setItem('gradelab-guest-name', name)
        } catch {
          /* ignore */
        }
      }
      showToast('Name updated ✓')
    },
    [user, showToast],
  )

  const promptUnlock = useCallback(() => {
    if (user) {
      setPaywallOpen(true)
    } else {
      // Guests keep their place: the sign-up screen's Back returns to the app.
      setShowAuth(true)
    }
  }, [user])

  // Free-plan gate. Runs `proceed` straight away for full access or an
  // already-unlocked set; otherwise asks before spending a free set.
  const requestSet = useCallback(
    (req, proceed) => {
      if (hasAccess || (!req.premiumOnly && isSetUnlocked(req.key))) {
        proceed()
        return
      }
      pendingSetRef.current = proceed
      setSetRequest(req)
    },
    [hasAccess],
  )
  const confirmSet = useCallback(async () => {
    if (!setRequest) return
    const req = setRequest
    if (await claimSet(req.key)) {
      const go = pendingSetRef.current
      pendingSetRef.current = null
      setSetRequest((cur) => (cur === req ? null : cur))
      if (go) go()
    }
    // Otherwise the account's allowance was used up elsewhere: the modal stays
    // open and re-renders with the updated count ("You've used all 5").
  }, [setRequest])
  const closeSet = useCallback(() => {
    pendingSetRef.current = null
    setSetRequest(null)
  }, [])
  const upgradeFromSet = useCallback(() => {
    closeSet()
    promptUnlock()
  }, [closeSet, promptUnlock])

  const removeCustomCard = useCallback((id) => {
    setCustom((cur) => {
      const next = cur.filter((c) => c.id !== id)
      saveCustom(subjectId, next)
      return next
    })
  }, [subjectId])

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      showToast('Email address copied')
    } catch {
      window.prompt('Copy our contact email:', SUPPORT_EMAIL)
    }
  }, [showToast])

  // Keyboard shortcuts while studying.
  useEffect(() => {
    if (view !== 'study') return
    const onKey = (e) => {
      if (e.target && e.target.tagName === 'SELECT') return
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          setFlipped((f) => !f)
          break
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case 'k':
        case 'K':
          mark('known')
          break
        case 'j':
        case 'J':
          mark('learning')
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, next, prev, mark])

  // Overall stats for the visible cards.
  const stats = useMemo(() => {
    const vis = allCards.filter(visibleByTier)
    let known = 0
    let learning = 0
    vis.forEach((c) => {
      if (progress[c.id] === 'known') known++
      else if (progress[c.id] === 'learning') learning++
    })
    const total = vis.length
    return { known, learning, unseen: total - known - learning, total, pct: total ? Math.round((known / total) * 100) : 0 }
  }, [allCards, progress, visibleByTier])

  // Live "saved" label for the footer (nowTick keeps it fresh).
  const syncLabel = useMemo(() => {
    void nowTick
    if (syncState.status === 'saving') return 'Saving…'
    if (syncState.status === 'error') return '⚠ Save failed — tap Back up now'
    if (syncState.at) return `✓ Saved ${relTime(syncState.at)}`
    return 'Progress syncs to your account'
  }, [syncState, nowTick])

  // Gamification: recompute whenever progress, the active subject, custom cards
  // or a manual tick (shop purchase / finished quiz) changes.
  const refreshGame = useCallback(() => setGameTick((t) => t + 1), [])
  const game = useMemo(() => computeGame(), [progress, subjectId, custom, gameTick])
  const headerGame = useMemo(
    () => ({
      level: game.level,
      balance: game.balance,
      avatar: equippedAvatar(game.game),
      currencyIcon: CURRENCY.icon,
    }),
    [game],
  )

  // Dashboard navigation + data. The current subject's in-memory progress
  // is merged over the localStorage snapshot because the persist effect
  // runs after render — without this the dashboard would lag one mark.
  const progressBySubject = useMemo(
    () => ({ ...gatherLocalProgress(), [subjectId]: progress }),
    [progress, subjectId],
  )
  const goDashboard = useCallback(() => {
    setPage('dashboard')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const openSubject = useCallback(
    (id) => {
      switchSubject(id)
      setPage('subject')
    },
    [switchSubject],
  )
  const quickAction = useCallback(
    (m, id) => {
      if (id && id !== subjectId) switchSubject(id)
      setContentMode(m)
      if (view === 'study') setView('topics')
      setPage('subject')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [switchSubject, subjectId, view],
  )

  // Due reviews per subject, for the dashboard (free plan: unlocked decks only).
  const dueBySubject = useMemo(() => {
    const today = dayNumber()
    const anchor = getAnchor(today)
    const out = {}
    SUBJECT_ORDER.forEach((id) => {
      const s = SUBJECTS[id]
      if (!s) return
      const prog = id === subjectId ? progress : progressBySubject[id] || {}
      const cards = flattenCards(s).filter((c) => !isFree || freeSets.isUnlocked(setKey.cards(id, c.code)))
      out[id] = dueCards(cards, prog, loadSchedule(id), anchor, today).length
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressBySubject, progress, subjectId, isFree, freeSets.used, activityTick])

  // "Review due cards" from the dashboard: switch subject first if needed, then
  // start the review once that subject's cards are loaded.
  const [pendingReview, setPendingReview] = useState(null)
  const reviewDue = useCallback(
    (id) => {
      setContentMode('cards')
      setPage('subject')
      if (id && id !== subjectId) {
        switchSubject(id)
        setPendingReview(id)
      } else {
        startSession('DUE')
      }
    },
    [subjectId, switchSubject, startSession],
  )
  useEffect(() => {
    if (pendingReview && pendingReview === subjectId) {
      setPendingReview(null)
      startSession('DUE')
    }
  }, [pendingReview, subjectId, startSession])

  // Push the player's score to the global leaderboard (debounced) when signed in.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    const t = setTimeout(() => {
      upsertLeaderboard({
        id: user.id,
        name: displayName,
        xp: game.xp,
        level: game.level,
        rank: game.rank.name,
      })
    }, 1200)
    return () => clearTimeout(t)
  }, [user, game.xp, game.level, displayName])

  if (isSupabaseConfigured) {
    if (recovery) {
      return <AuthGate recovery onRecovered={() => setRecovery(false)} />
    }
    if (!user && (access !== 'demo' || showAuth)) {
      if (!showAuth) {
        return <Landing onStart={() => setShowAuth(true)} onDemo={enterDemo} />
      }
      // Guests reach this from "Create free account" and go straight back to
      // the app with Back; visitors from the landing page go back to it.
      return (
        <AuthGate
          onDemo={enterDemo}
          onBack={() => setShowAuth(false)}
          backLabel={access === 'demo' ? '← Back to Grade Lab' : '← Back to home'}
        />
      )
    }
  } else if (access === 'locked') {
    return <Gate onUnlock={unlock} onDemo={enterDemo} />
  }

  if (shopOpen) {
    return <Shop onExit={() => setShopOpen(false)} onChange={refreshGame} />
  }

  if (leaderboardOpen) {
    return <Leaderboard user={user} displayName={displayName} onExit={() => setLeaderboardOpen(false)} />
  }

  if (profileOpen) {
    return (
      <Profile
        name={displayName}
        email={user ? user.email : null}
        onExit={() => setProfileOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onSaveName={saveName}
        onDeleteAccount={user ? handleDeleteAccount : null}
      />
    )
  }

  // The owner account is for watching, not answering — show the dashboard.
  if (user && isOwner && adminOpen) {
    return (
      <>
        <AdminDashboard user={user} onExit={() => setAdminOpen(false)} />
        <AnimatePresence>
          {welcome && (
            <WelcomeSplash name={welcome.name} quote={welcome.quote} onDone={() => setWelcome(null)} />
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />

      {isFree && (
        <div className="demo-banner">
          <span>
            Free plan — {freeSets.used} of {freeSets.limit} free sets used
            <span className="plan-meter" aria-hidden="true">
              {Array.from({ length: freeSets.limit }, (_, i) => (
                <span key={i} className={'plan-pip' + (i < freeSets.used ? ' used' : '')} />
              ))}
            </span>
          </span>
          <button className="demo-signin" onClick={promptUnlock}>
            {user ? 'Get full access' : 'Create free account'}
          </button>
        </div>
      )}

      <div className="app-shell">
      <Sidebar
        subject={subject}
        subjectOrder={SUBJECT_ORDER}
        subjects={SUBJECTS}
        onSwitch={openSubject}
        stats={stats}
        deckCount={stats.total}
        onProfile={() => setProfileOpen(true)}
        profileName={displayName}
        game={headerGame}
        contentMode={contentMode}
        onChangeContentMode={(m) => quickAction(m)}
        page={page}
        onGoDashboard={goDashboard}
        view={view}
        onGoTopics={goTopics}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-body">
        {/* Mobile top bar with hamburger — desktop hides via CSS */}
        <div className="mtop">
          <button
            className="mtop-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="mtop-title">
            <span className="mtop-subj">{page === 'dashboard' ? 'Dashboard' : subject.name}</span>
            <span className="mtop-mode">
              {page === 'dashboard'
                ? 'Overview'
                : contentMode === 'cards'
                  ? 'Flashcards'
                  : contentMode === 'quiz'
                    ? 'Quiz'
                    : contentMode === 'papers'
                      ? 'Past Papers'
                      : 'Exam Questions'}
            </span>
          </div>
        </div>

      <main className="main">
        <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={page === 'dashboard' ? 'dashboard' : `${subjectId}:${contentMode}`}>
        {page === 'dashboard' ? (
          <Dashboard
            displayName={displayName}
            subjectOrder={SUBJECT_ORDER}
            subjects={SUBJECTS}
            progressBySubject={progressBySubject}
            game={game}
            currencyIcon={CURRENCY.icon}
            currentSubjectId={subjectId}
            readOnly={false}
            activityTick={activityTick}
            onOpenSubject={openSubject}
            onQuickAction={quickAction}
            dueBySubject={dueBySubject}
            onReviewDue={reviewDue}
          />
        ) : contentMode === 'papers' ? (
          <PastPapersView subject={subject} canPost={isOwner} />
        ) : contentMode === 'exam' ? (
          hasQuestions(subjectId) ? (
            <QuestionsView
              subjectId={subjectId}
              isFree={isFree}
              isUnlocked={(section) => freeSets.isUnlocked(setKey.exam(subjectId, section))}
              onGate={(section) =>
                requestSet({ key: setKey.exam(subjectId, section), label: section, kind: 'exam' }, () => {})
              }
            />
          ) : (
            <p className="admin-empty">
              Exam questions for {subject.name} are coming soon — they’re being added subject by subject.
            </p>
          )
        ) : contentMode === 'quiz' ? (
          <QuizView
            subject={subject}
            cards={allCards}
            onGate={requestSet}
            onComplete={(correct, total) => {
              recordQuiz(correct, total)
              logActivity({ t: 'quiz', s: subjectId, n: total, k: correct })
              setActivityTick((t) => t + 1)
              refreshGame()
            }}
          />
        ) : (
        <AnimatePresence mode="wait">
          {view === 'topics' ? (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <TopicsView
                subject={subject}
                progress={progress}
                visibleByTier={visibleByTier}
                hasHT={hasHT}
                hasOnly={hasOnly}
                hideHT={hideHT}
                hideOnly={hideOnly}
                setHideHT={setHideHT}
                setHideOnly={setHideOnly}
                onStudyTopic={(code) => {
                  if (mineOnly) return startSession(code) // your own cards are always free
                  const t = subject.topics.find((x) => x.code === code)
                  requestSet(
                    { key: setKey.cards(subjectId, code), label: t ? `${code} ${t.name}` : code, kind: 'cards' },
                    () => startSession(code),
                  )
                }}
                dueCount={dueNow.length}
                onReviewDue={() => startSession('DUE')}
                onStudyAll={() =>
                  requestSet({ key: 'all', label: 'Study all topics', kind: 'cards', premiumOnly: true }, () =>
                    startSession('ALL'),
                  )
                }
                topicFreeState={(code) =>
                  !isFree
                    ? null
                    : freeSets.isUnlocked(setKey.cards(subjectId, code))
                      ? 'unlocked'
                      : freeSets.left === 0
                        ? 'locked'
                        : null
                }
                custom={custom}
                onAddCustom={addCustomCard}
                onRemoveCustom={removeCustomCard}
                mineOnly={mineOnly}
                setMineOnly={setMineOnly}
              />
            </motion.div>
          ) : (
            <motion.div
              key="study"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <StudyView
                subject={subject}
                session={session}
                progress={progress}
                flipped={flipped}
                setFlipped={setFlipped}
                mode={mode}
                onChangeMode={changeMode}
                onBack={goTopics}
                onNext={next}
                onPrev={prev}
                onMark={mark}
                onShuffle={shuffle}
                locked={
                  isFree &&
                  session.topicCode !== 'DUE' &&
                  !freeSets.isUnlocked(setKey.cards(subjectId, session.topicCode))
                }
                onUnlock={promptUnlock}
              />
            </motion.div>
          )}
        </AnimatePresence>
        )}
        </PageTransition>
        </AnimatePresence>
      </main>

      <footer className="footer">
        <span>
          {user ? (
            <>
              Signed in as {user.email}{isOwner ? ' (owner)' : ''}
              <span className="dotsep"> · </span>
              <span className={'sync-status ' + syncState.status}>{syncLabel}</span>
            </>
          ) : isFree ? (
            'Free plan — progress saves on this device. Create a free account to keep it everywhere.'
          ) : (
            'Progress saves automatically in this browser, per subject.'
          )}
        </span>
        <span className="footer-actions">
          <button className="link-btn" onClick={() => setContactOpen(true)}>Contact</button>
          <a className="link-btn" href="./privacy.html" target="_blank" rel="noopener">Privacy</a>
          <a className="link-btn" href="./terms.html" target="_blank" rel="noopener">Terms</a>
          {isFree && (
            <button className="link-btn" onClick={promptUnlock}>
              {user ? 'Get full access' : 'Create free account'}
            </button>
          )}
          {user && (
            <button className="link-btn" onClick={backupNow} disabled={syncState.status === 'saving'}>
              {syncState.status === 'saving' ? '⟳ Backing up…' : '⟳ Back up now'}
            </button>
          )}
          {user && isOwner && (
            <button className="link-btn" onClick={() => setAdminOpen(true)}>🛠 Dashboard</button>
          )}
          {user && !isOwner && hasAccess && STRIPE_PORTAL_LINK && (
            <a className="link-btn" href={STRIPE_PORTAL_LINK} target="_blank" rel="noreferrer">
              Manage subscription
            </a>
          )}
          <button className="link-btn" onClick={resetSubject}>
            Reset this subject
          </button>
          {(user || !isFree) && (
            <button className="link-btn" onClick={signOut}>
              {user ? 'Sign out' : 'Lock'}
            </button>
          )}
        </span>
      </footer>
      </div>
      </div>

      <AnimatePresence>
        {setRequest && (
          <UnlockSetModal
            request={setRequest}
            used={freeSets.used}
            onConfirm={confirmSet}
            onUpgrade={upgradeFromSet}
            onClose={closeSet}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSupabaseConfigured && user && !hasAccess && paywallOpen && (
          <Paywall
            email={user.email}
            onClose={() => setPaywallOpen(false)}
            onRefresh={refreshPaid}
            onSignOut={signOut}
            refreshing={checkingPaid}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contactOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setContactOpen(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setContactOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <h2 style={{ marginTop: 0 }}>Get in touch</h2>
              <p>Questions, access issues or feedback? Email us and we'll get back to you.</p>
              <p className="contact-email">{SUPPORT_EMAIL}</p>
              <div className="contact-actions">
                <button className="btn primary" onClick={copyEmail}>
                  Copy email
                </button>
                <a
                  className="btn"
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Gmail
                </a>
                <a className="btn" href={`mailto:${SUPPORT_EMAIL}`}>
                  Use mail app
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {welcome && (
          <WelcomeSplash
            name={welcome.name}
            quote={welcome.quote}
            onDone={() => setWelcome(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deckDone && (
          <DeckComplete count={deckDone.count} onClose={() => setDeckDone(null)} />
        )}
      </AnimatePresence>

      <Toast toast={toast} />
    </div>
  )
}
