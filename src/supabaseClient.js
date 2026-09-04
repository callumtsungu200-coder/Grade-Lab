import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./supabaseConfig.js"

export { isSupabaseConfigured }

/* Only create a client if the config has been filled in. Otherwise the app
   falls back to the shared-password + localStorage mode. */
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Log the user in automatically when they arrive from the email
        // confirmation link (the session comes back in the URL).
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

/* ---- Cloud progress helpers ----
   Each user has one row in the "user_progress" table holding a JSON blob:
   { "biology": { "1.1|What is...": "known" }, "chemistry": {...}, ... } */

export async function fetchCloudProgress(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("user_progress")
    .select("progress")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.warn("fetchCloudProgress error", error.message)
    return null
  }
  return data ? data.progress : null
}

export async function saveCloudProgress(userId, progress) {
  if (!supabase) return { ok: false, error: "not-configured" }
  // Safety net: never overwrite a user's saved progress with an empty blob.
  if (!progress || Object.keys(progress).length === 0) return { ok: false, empty: true }
  const { error } = await supabase
    .from("user_progress")
    .upsert({ id: userId, progress, updated_at: new Date().toISOString() })
  if (error) {
    console.warn("saveCloudProgress error", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

/* Returns whether this user has paid (reads their profile row). */
export async function fetchPaid(userId) {
  if (!supabase) return false
  const { data, error } = await supabase
    .from("profiles")
    .select("paid")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.warn("fetchPaid error", error.message)
    return false
  }
  return !!(data && data.paid)
}

/* ---- Owner dashboard helpers ----
   These only return data / succeed when the logged-in user is the owner,
   because Row Level Security restricts reading/updating other people's
   profiles to the owner email (see supabase-admin.sql). */

export async function fetchAllProfiles() {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, paid, plan, created_at")
    .order("created_at", { ascending: false })
  if (error) {
    console.warn("fetchAllProfiles error", error.message)
    return { data: [], error: error.message }
  }
  return { data: data || [], error: null }
}

export async function updateProfileAccess(id, fields) {
  if (!supabase) return { error: "No connection." }
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) console.warn("updateProfileAccess error", error.message)
  return { error: error ? error.message : null }
}

/* Permanently delete a user account (owner only). Calls the SECURITY DEFINER
   function from supabase-delete-user.sql, which enforces that the caller is the
   owner. Removes the auth user plus their profile, progress and leaderboard row. */
export async function deleteUser(id) {
  if (!supabase) return { ok: false, error: "No connection." }
  const { error } = await supabase.rpc("admin_delete_user", { target: id })
  if (error) {
    console.warn("deleteUser error", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

/* Edit a user's name and/or email (owner only). See supabase-edit-user.sql. */
export async function updateUserDetails(id, { email, first_name, last_name }) {
  if (!supabase) return { ok: false, error: "No connection." }
  const { error } = await supabase.rpc("admin_update_user", {
    target: id,
    new_email: email ?? null,
    new_first: first_name ?? "",
    new_last: last_name ?? "",
  })
  if (error) {
    console.warn("updateUserDetails error", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

/* Self-service: the signed-in user deletes their OWN account. See
   supabase-delete-user.sql (delete_own_account, acts only on auth.uid()). */
export async function deleteOwnAccount() {
  if (!supabase) return { ok: false, error: "No connection." }
  const { error } = await supabase.rpc("delete_own_account")
  if (error) {
    console.warn("deleteOwnAccount error", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

/* ---- Leaderboard helpers ----
   A "leaderboard" table (see supabase-leaderboard.sql) holds one row per user
   with their display name, XP, level and rank. Any signed-in user can read the
   whole board; each user may only write their own row. If the table hasn't been
   created yet these helpers fail softly so the rest of the app keeps working. */

export async function upsertLeaderboard(entry) {
  if (!supabase || !entry?.id) return { ok: false, error: "No connection." }
  const { error } = await supabase
    .from("leaderboard")
    .upsert({ ...entry, updated_at: new Date().toISOString() })
  if (error) {
    console.warn("upsertLeaderboard error", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}

export async function fetchLeaderboard(limit = 50) {
  if (!supabase) return { data: [], error: "not-configured" }
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, name, xp, level, rank")
    .order("xp", { ascending: false })
    .limit(limit)
  if (error) {
    console.warn("fetchLeaderboard error", error.message)
    return { data: [], error: error.message }
  }
  return { data: data || [], error: null }
}
