/* Short GCSE motivation quotes shown on the welcome splash. Keep them short. */
export const QUOTES = [
  "Small steps every day add up to big results.",
  "You don't have to be perfect, just consistent.",
  "The expert in anything was once a beginner.",
  "Study now, shine later.",
  "One topic at a time — you've got this.",
  "Discipline beats motivation. Just show up.",
  "Every card you learn is a mark you gain.",
  "Progress, not perfection.",
  "Hard work beats talent when talent doesn't work.",
  "Your future self will thank you.",
  "Dream big. Revise hard.",
  "A little progress each day adds up.",
  "Focus on the next card, not the whole exam.",
  "Consistency is your superpower.",
  "You're closer than you were yesterday.",
  "Grades are earned one revision session at a time.",
]

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}
