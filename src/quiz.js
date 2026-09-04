/* Quiz engine — builds multiple-choice questions from the flashcard bank.
   Each card (question + answer) becomes an MC question whose correct option is
   the card's answer and whose distractors are other answers from the same
   topic (falling back to the whole subject). Tracks which questions a user has
   already answered so they can be filtered out. */

const seenKey = (subjectId) => `gradelab-quiz-seen-${subjectId}-v1`

export function loadSeen(subjectId) {
  try {
    const arr = JSON.parse(localStorage.getItem(seenKey(subjectId)))
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function markSeen(subjectId, ids) {
  try {
    const cur = loadSeen(subjectId)
    ids.forEach((i) => cur.add(i))
    localStorage.setItem(seenKey(subjectId), JSON.stringify([...cur]))
  } catch {
    /* ignore */
  }
}

export function clearSeen(subjectId) {
  try {
    localStorage.removeItem(seenKey(subjectId))
  } catch {
    /* ignore */
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build up to `count` MC questions from `cards`.
// cards: [{ id, q, a, code, topicName }]
export function buildQuiz(cards, count, { excludeIds } = {}) {
  let pool = cards.filter((c) => c.q && c.a)

  // Skip already-answered questions if asked and enough remain.
  if (excludeIds && excludeIds.size) {
    const fresh = pool.filter((c) => !excludeIds.has(c.id))
    if (fresh.length >= 4) pool = fresh
  }

  const chosen = shuffle(pool).slice(0, Math.min(count, pool.length))

  return chosen.map((card) => {
    // Prefer distractors from the same subtopic, then the wider subject.
    const sameTopic = cards.filter((c) => c.id !== card.id && c.a !== card.a && c.code === card.code)
    let others = sameTopic
    if (others.length < 3) {
      others = cards.filter((c) => c.id !== card.id && c.a !== card.a)
    }
    // Dedupe distractor answers.
    const seenAns = new Set([card.a])
    const distractors = []
    for (const c of shuffle(others)) {
      if (!seenAns.has(c.a)) {
        seenAns.add(c.a)
        distractors.push(c.a)
      }
      if (distractors.length === 3) break
    }
    const options = shuffle([card.a, ...distractors])
    return { id: card.id, q: card.q, topicName: card.topicName, options, correct: card.a }
  })
}
