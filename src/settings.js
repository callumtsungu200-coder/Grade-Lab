/* Small app-wide settings store (localStorage). Add keys with a default here. */

const KEY = "gradelab-settings-v1"

const DEFAULTS = {
  deckCelebration: true, // show the cinematic celebration when a deck is finished
  theme: "light", // 'light' | 'dark' — app-wide display
}

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function getSetting(key) {
  return loadSettings()[key]
}

export function setSetting(key, value) {
  const s = loadSettings()
  s[key] = value
  saveSettings(s)
  return s
}
