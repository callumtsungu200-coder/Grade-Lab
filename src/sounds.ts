/* Tiny Web Audio synth for quiz feedback. No audio files — every cue is a
   few oscillator notes with a short envelope, so there's nothing to load,
   license or cache. Respects a persisted mute (localStorage). The
   AudioContext is created lazily inside a user gesture (a click or key
   press on an option), which is what iOS requires. */

const KEY = 'gradelab-sound'
let ctx: AudioContext | null = null

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** Call from the first user gesture (e.g. "Start quiz") so later cues play instantly on iOS. */
export function unlockAudio(): void {
  getCtx()
}

interface Note {
  /** frequency in Hz */
  f: number
  /** optional glide-to frequency over the note's duration */
  f2?: number
  /** start offset in seconds */
  t: number
  /** duration in seconds */
  d: number
  /** relative gain 0–1 */
  g?: number
  type?: OscillatorType
}

function play(notes: Note[], master = 0.16): void {
  if (!isSoundOn()) return
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const out = c.createGain()
  out.gain.value = master
  out.connect(c.destination)
  for (const n of notes) {
    const o = c.createOscillator()
    o.type = n.type || 'sine'
    o.frequency.setValueAtTime(n.f, now + n.t)
    if (n.f2) o.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.d)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, now + n.t)
    g.gain.exponentialRampToValueAtTime(n.g ?? 1, now + n.t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    o.connect(g)
    g.connect(out)
    o.start(now + n.t)
    o.stop(now + n.t + n.d + 0.03)
  }
}

export const sounds = {
  /** soft click — starting a quiz, moving on */
  tap: () => play([{ f: 880, t: 0, d: 0.05, g: 0.5, type: 'triangle' }], 0.07),
  /** bright rising pair (E5 → B5) */
  correct: () =>
    play([
      { f: 659.25, t: 0, d: 0.14, type: 'triangle' },
      { f: 987.77, t: 0.09, d: 0.24, type: 'triangle' },
    ]),
  /** low, soft "bonk" with a downward glide — clear but never harsh */
  wrong: () =>
    play(
      [
        { f: 220, f2: 140, t: 0, d: 0.24, type: 'sine' },
        { f: 233, f2: 150, t: 0, d: 0.24, g: 0.5, type: 'triangle' },
      ],
      0.14,
    ),
  /** C-major arpeggio up (C5 E5 G5 C6) */
  complete: () =>
    play([
      { f: 523.25, t: 0, d: 0.18, type: 'triangle' },
      { f: 659.25, t: 0.11, d: 0.18, type: 'triangle' },
      { f: 783.99, t: 0.22, d: 0.2, type: 'triangle' },
      { f: 1046.5, t: 0.33, d: 0.45, type: 'triangle' },
    ]),
  /** the arpeggio plus a little sparkle on top — perfect score */
  perfect: () =>
    play([
      { f: 523.25, t: 0, d: 0.18, type: 'triangle' },
      { f: 659.25, t: 0.1, d: 0.18, type: 'triangle' },
      { f: 783.99, t: 0.2, d: 0.2, type: 'triangle' },
      { f: 1046.5, t: 0.3, d: 0.5, type: 'triangle' },
      { f: 1318.5, t: 0.46, d: 0.3, g: 0.5, type: 'sine' },
      { f: 1568, t: 0.58, d: 0.5, g: 0.4, type: 'sine' },
    ]),
}

/** Short vibration on devices that support it (Android). iOS ignores it. */
export function haptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
