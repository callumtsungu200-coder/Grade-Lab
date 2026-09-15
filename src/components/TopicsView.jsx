import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
}
const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } },
}

// The "＋" tile shown at the end of each section's grid.
function AddTile({ onClick }) {
  return (
    <motion.button
      className="topic-card add-tile"
      variants={item}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
    >
      <span className="add-plus">＋</span>
      <span className="add-label">Add your own card</span>
    </motion.button>
  )
}

// Custom, on-theme dropdown (the native <select> popup can't be styled).
function Dropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.code === value)
  return (
    <div className="dd">
      <button type="button" className="gate-input dd-btn" onClick={() => setOpen((o) => !o)}>
        <span className="dd-current">{current ? current.name : 'Select a subtopic…'}</span>
        <span className={'dd-caret' + (open ? ' up' : '')}>▾</span>
      </button>
      {open && (
        <>
          <div className="dd-backdrop" onClick={() => setOpen(false)} />
          <div className="dd-menu">
            {options.map((o) => (
              <button
                type="button"
                key={o.code}
                className={'dd-opt' + (o.code === value ? ' active' : '')}
                onClick={() => { onChange(o.code); setOpen(false) }}
              >
                {o.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Modal to add a card, with a subtopic chooser (scoped to a section if given).
function AddCardModal({ title, topics, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [code, setCode] = useState(topics[0]?.code || '')

  const submit = (e) => {
    e.preventDefault()
    const t = topics.find((x) => x.code === code)
    onAdd(q, a, code, t ? t.name : 'My flashcards')
    onClose()
  }

  return (
    <motion.div className="modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 style={{ marginTop: 0 }}>Add a flashcard</h2>
        <p className="gate-sub" style={{ marginTop: 4 }}>{title}</p>
        <form onSubmit={submit} className="addcard-form">
          <label className="addcard-label">Subtopic</label>
          <Dropdown options={topics} value={code} onChange={setCode} />
          <input className="gate-input" placeholder="Question / front" value={q} onChange={(e) => setQ(e.target.value)} required autoFocus />
          <input className="gate-input" placeholder="Answer / back" value={a} onChange={(e) => setA(e.target.value)} required />
          <button type="submit" className="btn big primary">Add card</button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// freeState: null (full access / not applicable) | 'unlocked' | 'locked'
function TopicCard({ subject, topic, progress, visibleByTier, onStudyTopic, freeState = null }) {
  const cards = topic.cards
    .map((c) => ({ id: topic.code + '|' + c[0], tier: c[2] || '' }))
    .filter(visibleByTier)
  const total = cards.length
  const onlyCode = subject.onlyCode
  const isTripleOnly =
    onlyCode &&
    onlyCode !== 'NA' &&
    topic.cards.length > 0 &&
    topic.cards.every((c) => (c[2] || '').includes(onlyCode))
  let known = 0
  let learning = 0
  cards.forEach((c) => {
    if (progress[c.id] === 'known') known++
    else if (progress[c.id] === 'learning') learning++
  })
  const knownPct = total ? (known / total) * 100 : 0
  const learnPct = total ? (learning / total) * 100 : 0

  return (
    <motion.button
      className="topic-card"
      variants={item}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onStudyTopic(topic.code)}
    >
      <span className="tc-line" />
      <div className="tc-top">
        <span className="code">{topic.code}</span>
        {freeState === 'unlocked' && <span className="tc-free">Free set</span>}
        {freeState === 'locked' && (
          <span className="tc-lock" aria-label="Needs full access" title="Needs full access">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
        )}
      </div>
      <span className="tc-name">
        {topic.name}
        {isTripleOnly && <span className="tc-triple">(Triple only)</span>}
      </span>
      <div className="tc-foot">
        <div className="bar">
          <span className="seg-known" style={{ width: knownPct + '%' }} />
          <span className="seg-learning" style={{ width: learnPct + '%' }} />
        </div>
        <div className="tc-meta">
          <span>{known} / {total}</span>
          <span>{total} cards</span>
        </div>
      </div>
    </motion.button>
  )
}

export default function TopicsView({
  subject,
  progress,
  visibleByTier,
  onStudyTopic,
  onStudyAll,
  topicFreeState, // (code) => null | 'unlocked' | 'locked'
  dueCount = 0,
  onReviewDue,
  custom = [],
  onAddCustom,
  onRemoveCustom,
  mineOnly,
  setMineOnly,
}) {
  const grouped = subject.topics.some((t) => t.group)
  // { title, topics } for the add-card modal; null when closed.
  const [addTarget, setAddTarget] = useState(null)
  const [myOpen, setMyOpen] = useState(false) // expandable "my cards" list

  // Build ordered list of groups (preserving first-appearance order).
  const groups = []
  let byGroup
  if (grouped) {
    const map = new Map()
    subject.topics.forEach((t) => {
      const g = t.group || 'Other'
      if (!map.has(g)) {
        map.set(g, [])
        groups.push(g)
      }
      map.get(g).push(t)
    })
    byGroup = map
  }

  // Group the user's own cards by the subtopic they were filed under.
  const customGroups = []
  if (mineOnly) {
    const map = new Map()
    custom.forEach((c) => {
      const key = c.code || 'MINE'
      if (!map.has(key)) {
        map.set(key, { code: key, name: c.topicName || 'My flashcards', cards: [] })
        customGroups.push(map.get(key))
      }
      map.get(key).cards.push(c)
    })
  }

  return (
    <section>
      {dueCount > 0 && !mineOnly && (
        <div className="due-bar">
          <div className="due-bar-text">
            <span className="due-bar-count">{dueCount}</span>
            <span className="due-bar-copy">
              {dueCount === 1 ? 'card is' : 'cards are'} due for review
              <span className="due-bar-sub">Spaced repetition brings cards back just before you'd forget them.</span>
            </span>
          </div>
          <button type="button" className="btn big due-bar-btn" onClick={onReviewDue}>
            Review now
          </button>
        </div>
      )}

      {/* My flashcards: a pressable box that expands/contracts */}
      <div className="mycards">
        <button className="mycards-toggle" onClick={() => setMyOpen((o) => !o)} aria-expanded={myOpen}>
          <span className="mycards-toggle-left">
            <span className="mycards-pen">🖊️</span>
            {myOpen ? 'Hide my flashcards' : 'Show my flashcards'}
            {custom.length > 0 && <span className="mycards-count">{custom.length}</span>}
          </span>
          <span className={'mycards-chevron' + (myOpen ? ' up' : '')}>▾</span>
        </button>

        <div className={'mycards-collapse' + (myOpen ? ' open' : '')}>
          <div className="mycards-collapse-inner">
            <div className="mycards-body">
              <label className="mine-toggle">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                <span>Only show my cards</span>
              </label>

              {custom.length === 0 ? (
                <p className="mycards-empty">
                  Tap a <strong>＋ Add your own card</strong> tile under any section to create your own flashcards.
                  Only you can see and edit these — the built-in cards can't be changed.
                </p>
              ) : (
                <ul className="mycards-list">
                  {custom.map((c) => (
                    <li className="mycard" key={c.id}>
                      <div className="mycard-text">
                        <span className="mycard-q">{c.q}</span>
                        <span className="mycard-a">{c.a}</span>
                        {c.topicName && <span className="mycard-topic">📁 {c.topicName}</span>}
                      </div>
                      <button className="mycard-del" onClick={() => onRemoveCustom(c.id)} title="Delete this card" aria-label="Delete card">🗑</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {mineOnly ? (
        custom.length === 0 ? (
          <p className="admin-empty">You haven't added any cards yet — tap a “＋ Add your own card” tile to create some.</p>
        ) : (
          <>
            <motion.div className="topic-grid" variants={container} initial="hidden" animate="show">
              {customGroups.map((g) => (
                <motion.button
                  key={g.code}
                  className="topic-card"
                  variants={item}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => onStudyTopic(g.code)}
                >
                  <span className="tc-line" />
                  <div className="tc-top"><span className="code">MINE</span></div>
                  <span className="tc-name">{g.name}</span>
                  <div className="tc-foot">
                    <div className="tc-meta"><span>{g.cards.length} of your cards</span></div>
                  </div>
                </motion.button>
              ))}
              <AddTile onClick={() => setAddTarget({ title: 'Choose any subtopic', topics: subject.topics })} />
            </motion.div>
            <motion.button className="btn big primary" onClick={onStudyAll} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
              Study all my cards →
            </motion.button>
          </>
        )
      ) : (
        <>
          {grouped ? (
            <motion.div variants={container} initial="hidden" animate="show" key={subject.id}>
              {groups.map((g) => (
                <div className="topic-group" key={g}>
                  <motion.h2 className="group-title" variants={item}>{g}</motion.h2>
                  <div className="topic-grid">
                    {byGroup.get(g).map((topic) => (
                      <TopicCard
                        key={topic.code}
                        subject={subject}
                        topic={topic}
                        progress={progress}
                        visibleByTier={visibleByTier}
                        onStudyTopic={onStudyTopic}
                freeState={topicFreeState ? topicFreeState(topic.code) : null}
                      />
                    ))}
                    <AddTile onClick={() => setAddTarget({ title: `In “${g}”`, topics: byGroup.get(g) })} />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div className="topic-grid" variants={container} initial="hidden" animate="show" key={subject.id}>
              {subject.topics.map((topic) => (
                <TopicCard
                  key={topic.code}
                  subject={subject}
                  topic={topic}
                  progress={progress}
                  visibleByTier={visibleByTier}
                  onStudyTopic={onStudyTopic}
                freeState={topicFreeState ? topicFreeState(topic.code) : null}
                />
              ))}
              <AddTile onClick={() => setAddTarget({ title: 'Choose a subtopic', topics: subject.topics })} />
            </motion.div>
          )}

          <motion.button className="btn big primary" onClick={onStudyAll} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
            Study all topics →
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {addTarget && (
          <AddCardModal
            title={addTarget.title}
            topics={addTarget.topics}
            onAdd={onAddCustom}
            onClose={() => setAddTarget(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
