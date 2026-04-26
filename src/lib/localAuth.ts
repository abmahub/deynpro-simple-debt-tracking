/**
 * Tiny local auth cache used by the Electron offline mode.
 *
 * After a successful Supabase sign-in we cache the user's id + email in
 * localStorage so subsequent app launches (without internet) can identify
 * the user and route data to the right rows in the local SQLite DB.
 *
 * This is NOT a security boundary — it only prevents data being stranded
 * under a generic "local" user when the device is offline. The real auth
 * check still happens against Supabase whenever the network is available.
 */
const KEY_USER_ID = "deynpro.cachedUserId";
const KEY_USER_EMAIL = "deynpro.cachedUserEmail";

export function cacheUserIdentity(userId: string, email?: string | null) {
  try {
    localStorage.setItem(KEY_USER_ID, userId);
    if (email) localStorage.setItem(KEY_USER_EMAIL, email);
  } catch { /* storage disabled — non-fatal */ }
}

export function clearCachedIdentity() {
  try {
    localStorage.removeItem(KEY_USER_ID);
    localStorage.removeItem(KEY_USER_EMAIL);
  } catch { /* ignore */ }
}

export function getCachedUserId(): string | null {
  try { return localStorage.getItem(KEY_USER_ID); } catch { return null; }
}

export function getCachedEmail(): string | null {
  try { return localStorage.getItem(KEY_USER_EMAIL); } catch { return null; }
}