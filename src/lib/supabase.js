import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Storage wrapper that never throws.
 *
 * Why: Safari in Private Browsing, certain ITP states, "Block all cookies",
 * and some content blockers can make `localStorage.setItem` throw a
 * QuotaExceededError or SecurityError. If Supabase auth hits that during
 * initialisation the whole module crashes and React never renders.
 *
 * Falling back to an in-memory Map keeps the session usable for the lifetime
 * of the tab (the user just has to log in again next time).
 */
const memoryStore = new Map()

// Shared safe wrapper used for both auth (localStorage) and realtime (sessionStorage).
const makeStorageWrapper = (nativeStorage) => ({
  getItem(key) {
    try { return nativeStorage.getItem(key) } catch { return memoryStore.get(key) ?? null }
  },
  setItem(key, value) {
    try { nativeStorage.setItem(key, value) } catch { memoryStore.set(key, value) }
  },
  removeItem(key) {
    try { nativeStorage.removeItem(key) } catch { memoryStore.delete(key) }
  },
})

const safeSessionStorage = makeStorageWrapper(
  typeof window !== 'undefined' ? window.sessionStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
)

const safeStorage = {
  getItem(key) {
    try { return window.localStorage.getItem(key) }
    catch { return memoryStore.has(key) ? memoryStore.get(key) : null }
  },
  setItem(key, value) {
    try { window.localStorage.setItem(key, value) }
    catch { memoryStore.set(key, value) }
  },
  removeItem(key) {
    try { window.localStorage.removeItem(key) }
    catch { memoryStore.delete(key) }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Supabase Realtime accesses sessionStorage directly for connection state.
    // Safari with blocked storage throws SecurityError there — pass a safe wrapper.
    sessionStorage: safeSessionStorage,
  },
})
