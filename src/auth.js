/* ------------------------------------------------------------------
   ACCESS PASSWORD
   ------------------------------------------------------------------
   Change the value below to your own password.

   ⚠️ IMPORTANT — this is a *soft* gate only. The whole site runs in the
   visitor's browser, so a technically-minded person could read this file
   in the page source and find the password (or bypass the gate entirely).
   It is fine for keeping casual visitors out and offering a read-only demo,
   but do NOT use it to protect anything genuinely sensitive.
   ------------------------------------------------------------------ */
export const ACCESS_PASSWORD = 'callum2011'

// localStorage key that remembers a successful unlock on this device.
export const AUTH_KEY = 'gcse-flashcards-access'

export function checkPassword(input) {
  return typeof input === 'string' && input.trim() === ACCESS_PASSWORD
}
