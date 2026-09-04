import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SUBJECTS, SUBJECT_ORDER, flattenCards } from "../subjects.js"
import { questionSections } from "../questions/index.js"
import {
  CURRENCY,
  computeGame,
  equippedAvatar,
  equippedTitle,
  equippedTheme,
} from "../gamification.js"
import { loadSettings, setSetting } from "../settings.js"

const cardKey = (id) => `gcse-flashcards-${id}-v1`
const examKey = (id) => `gradelab-exam-${id}-v1`

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

// Build flashcard + exam stats for one subject.
function subjectStats(id) {
  const subject = SUBJECTS[id]
  const cards = flattenCards(subject)
  const prog = readJSON(cardKey(id))
  let known = 0
  let learning = 0
  cards.forEach((c) => {
    const v = prog[c.id]
    if (v === "known") known++
    else if (v) learning++
  })
  const cardTotal = cards.length
  const cardSeen = known + learning

  const sections = questionSections(id)
  const examMarks = readJSON(examKey(id))
  let examTotal = 0
  Object.values(sections).forEach((arr) => (examTotal += arr.length))
  let full = 0
  let part = 0
  let none = 0
  Object.values(examMarks).forEach((v) => {
    if (v === "full") full++
    else if (v === "part") part++
    else if (v === "none") none++
  })
  const examMarked = full + part + none

  return { id, name: subject.name, icon: subject.icon, known, learning, cardSeen, cardTotal, full, part, none, examMarked, examTotal }
}

export default function Profile({ name, email, onExit, onOpenShop, onOpenLeaderboard, onSaveName, onDeleteAccount }) {
  const rows = useMemo(() => SUBJECT_ORDER.map(subjectStats), [])
  const game = useMemo(() => computeGame(), [])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [deckCel, setDeckCel] = useState(() => loadSettings().deckCelebration)

  const toggleDeckCel = () => {
    const v = !deckCel
    setDeckCel(v)
    setSetting("deckCelebration", v)
  }

  const [delOpen, setDelOpen] = useState(false)
  const [delText, setDelText] = useState("")
  const [delBusy, setDelBusy] = useState(false)
  const [delError, setDelError] = useState("")

  const canConfirmDelete = email && delText.trim().toLowerCase() === email.trim().toLowerCase()
  const confirmSelfDelete = async () => {
    if (!canConfirmDelete || !onDeleteAccount) return
    setDelBusy(true)
    setDelError("")
    const res = await onDeleteAccount()
    if (res && res.ok === false) {
      setDelBusy(false)
      setDelError(res.error || "Could not delete your account. Try again.")
    }
    // On success the app signs out and this screen unmounts.
  }

  const openEdit = () => {
    setDraft(name && name !== "Guest" && name !== "You" ? name : "")
    setEditing(true)
  }
  const saveEdit = () => {
    const v = draft.trim()
    if (v && onSaveName) onSaveName(v)
    setEditing(false)
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (t, r) => ({
        known: t.known + r.known,
        learning: t.learning + r.learning,
        cardTotal: t.cardTotal + r.cardTotal,
        full: t.full + r.full,
        part: t.part + r.part,
        none: t.none + r.none,
        examTotal: t.examTotal + r.examTotal,
      }),
      { known: 0, learning: 0, cardTotal: 0, full: 0, part: 0, none: 0, examTotal: 0 },
    )
  }, [rows])

  const initial = (name || "You").trim().charAt(0).toUpperCase()
  const avatar = equippedAvatar(game)
  const title = equippedTitle(game)
  const theme = equippedTheme(game)
  const cardUnseen = totals.cardTotal - totals.known - totals.learning
  const examUnmarked = totals.examTotal - totals.full - totals.part - totals.none

  return (
    <div className="admin">
      <div className="admin-inner">
        <header className="admin-head">
          <p className="admin-sub">Your profile</p>
          <button className="btn" onClick={onExit}>← Back</button>
        </header>

        {/* Gamification hero */}
        <div className={"game-hero" + (theme ? " pbanner-" + theme : "")}>
          <div className="game-hero-id">
            <span className="game-avatar">{avatar || initial}</span>
            <div className="game-id-text">
              <div className="game-name-row">
                <h1 className="game-name">{name}</h1>
                <button className="name-edit" onClick={openEdit} title="Change your name" aria-label="Change your name">
                  ✏️
                </button>
              </div>
              {title && <span className="game-title-chip">{title}</span>}
              <span className="game-rank">{game.rank.icon} {game.rank.name}</span>
            </div>
          </div>

          <div className="game-hero-stats">
            <div className="game-level">
              <span className="game-level-num">Lv {game.level}</span>
              <div className="xp-bar" title={`${game.xpIntoLevel} / ${game.xpForNextLevel} XP to next level`}>
                <span style={{ width: game.levelProgress + "%" }} />
              </div>
              <span className="game-xp-label">{game.xp.toLocaleString()} XP total</span>
            </div>
            <div className="game-coins">
              <span className="coin-big">{CURRENCY.icon} {game.balance.toLocaleString()}</span>
              <span className="coin-label">{CURRENCY.name} to spend</span>
            </div>
          </div>

          <div className="game-hero-actions">
            <button className="btn primary" onClick={onOpenShop}>🛒 Shop</button>
            <button className="btn" onClick={onOpenLeaderboard}>🏆 Leaderboard</button>
          </div>
        </div>

        {/* Badges */}
        <div className="badges-head">
          <h2 className="profile-sub-h">Badges</h2>
          <span className="badges-count">{game.unlockedCount} / {game.badgeTotal} unlocked</span>
        </div>
        <div className="badges-grid">
          {game.badges.map((b) => (
            <div key={b.id} className={"badge" + (b.unlocked ? " unlocked" : " locked")} title={b.desc}>
              <span className="badge-icon">{b.unlocked ? b.icon : "🔒"}</span>
              <span className="badge-name">{b.name}</span>
              <span className="badge-desc">{b.desc}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <h2 className="profile-sub-h">Settings</h2>
        <div className="settings-card">
          <div className="setting-row">
            <span className="setting-text">
              <b>Deck celebration</b>
              <em>Show a cinematic congratulations when you finish a deck.</em>
            </span>
            <button
              type="button"
              className={"toggle" + (deckCel ? " on" : "")}
              onClick={toggleDeckCel}
              role="switch"
              aria-checked={deckCel}
              aria-label="Deck celebration"
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {email && onDeleteAccount && (
            <div className="setting-row danger-row">
              <span className="setting-text">
                <b>Delete my account</b>
                <em>Permanently remove your account and all your progress. This can't be undone.</em>
              </span>
              <button type="button" className="btn danger" onClick={() => { setDelText(""); setDelError(""); setDelOpen(true) }}>
                Delete account
              </button>
            </div>
          )}
        </div>

        {/* Two big summaries */}
        <h2 className="profile-sub-h">Progress</h2>
        <div className="profile-summary">
          <div className="summary-card">
            <p className="summary-title">🎴 Flashcards</p>
            <div className="summary-nums">
              <span className="sn sn-known"><b>{totals.known}</b> know</span>
              <span className="sn sn-learn"><b>{totals.learning}</b> still learning</span>
              <span className="sn sn-unseen"><b>{cardUnseen}</b> not seen</span>
            </div>
            <div className="pbar">
              <span className="pbar-known" style={{ width: pct(totals.known, totals.cardTotal) }} />
              <span className="pbar-learn" style={{ width: pct(totals.learning, totals.cardTotal) }} />
            </div>
            <p className="summary-foot">{totals.known} of {totals.cardTotal} cards marked as known</p>
          </div>

          <div className="summary-card">
            <p className="summary-title">📝 Exam questions</p>
            <div className="summary-nums">
              <span className="sn sn-known"><b>{totals.full}</b> full marks</span>
              <span className="sn sn-learn"><b>{totals.part}</b> partial</span>
              <span className="sn sn-none"><b>{totals.none}</b> not yet</span>
            </div>
            <div className="pbar">
              <span className="pbar-known" style={{ width: pct(totals.full, totals.examTotal) }} />
              <span className="pbar-learn" style={{ width: pct(totals.part, totals.examTotal) }} />
              <span className="pbar-none" style={{ width: pct(totals.none, totals.examTotal) }} />
            </div>
            <p className="summary-foot">{totals.full + totals.part + totals.none} of {totals.examTotal} questions marked · {examUnmarked} to try</p>
          </div>
        </div>

        {/* Per-subject breakdown */}
        <h2 className="profile-sub-h">By subject</h2>
        <div className="profile-subjects">
          {rows.map((r) => (
            <div className="psubject" key={r.id}>
              <div className="psubject-head">
                <span className="psubject-icon">{r.icon}</span>
                <span className="psubject-name">{r.name}</span>
              </div>
              <div className="psubject-stats">
                <span className="pchip pchip-known">✓ {r.known} known</span>
                <span className="pchip pchip-learn">◐ {r.learning} learning</span>
                <span className="pchip pchip-dim">{r.cardTotal} cards</span>
                {r.examTotal > 0 && (
                  <span className="pchip pchip-exam">📝 {r.full}/{r.examTotal} full</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {delOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !delBusy && setDelOpen(false)}
          >
            <motion.div
              className="modal-card del-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => !delBusy && setDelOpen(false)} aria-label="Close">✕</button>
              <h2 style={{ marginTop: 0 }}>Delete your account?</h2>
              <p className="del-warn">
                This permanently deletes your account, all your progress, badges and {CURRENCY.name}. It cannot be undone.
              </p>
              <label className="del-label">Type your email to confirm: <b>{email}</b></label>
              <input
                className="gate-input"
                type="email"
                value={delText}
                autoFocus
                placeholder="your email"
                onChange={(e) => { setDelText(e.target.value); setDelError("") }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canConfirmDelete) confirmSelfDelete()
                  if (e.key === "Escape" && !delBusy) setDelOpen(false)
                }}
              />
              {delError && <p className="gate-error">{delError}</p>}
              <div className="del-actions">
                <button className="btn" onClick={() => setDelOpen(false)} disabled={delBusy}>Cancel</button>
                <button className="btn danger" onClick={confirmSelfDelete} disabled={delBusy || !canConfirmDelete}>
                  {delBusy ? "Deleting…" : "Delete my account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(false)}
          >
            <motion.div
              className="modal-card name-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setEditing(false)} aria-label="Close">✕</button>
              <h2 style={{ marginTop: 0 }}>Change your name</h2>
              <p className="name-modal-sub">This is how you'll appear on your profile and the leaderboard.</p>
              <input
                className="gate-input"
                type="text"
                value={draft}
                maxLength={40}
                autoFocus
                placeholder="Enter your name"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit()
                  if (e.key === "Escape") setEditing(false)
                }}
              />
              <div className="name-modal-actions">
                <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn primary" onClick={saveEdit} disabled={!draft.trim()}>Save name</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function pct(n, total) {
  if (!total) return "0%"
  return Math.round((n / total) * 100) + "%"
}
