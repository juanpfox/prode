import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth'
import AppErrorFallback from './components/AppErrorFallback.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'
import { logError } from './lib/errorLogger'

// Flush any pre-bundle boot errors captured in index.html.
// These are errors that happened *before* this bundle executed —
// content blockers, parser errors, missing chunks, etc.
if (Array.isArray(window.__bootErrors) && window.__bootErrors.length) {
  for (const e of window.__bootErrors) {
    logError(
      { message: `boot:${e.kind} ${e.msg || ''}`.trim(), stack: null },
      'boot'
    )
  }
  window.__bootErrors.length = 0
}

// ---- Stale-chunk auto recovery ----
// `vite:preloadError` fires when a dynamic import points to a chunk that no
// longer exists (typical right after a Cloudflare deploy on a tab that had
// the old index.html cached). We reload once; a sessionStorage flag prevents
// infinite loops if the reload itself does not fix things.
window.addEventListener('vite:preloadError', (event) => {
  logError(
    { message: 'vite:preloadError', stack: null },
    String(event?.payload || event?.message || '')
  )
  const chunkReloaded = (() => { try { return sessionStorage.getItem('chunk-reload') } catch { return null } })()
  if (!chunkReloaded) {
    try { sessionStorage.setItem('chunk-reload', '1') } catch { /* ignore */ }
    // Hard wipe (SW + caches) is safer than location.reload() here because
    // a plain reload may still serve a cached HTML pointing to dead chunks.
    if (typeof window.__bustAndReload === 'function') window.__bustAndReload()
    else window.location.reload()
  }
})
// Clear the guard once we have successfully booted at least once this session.
queueMicrotask(() => {
  try { sessionStorage.removeItem('chunk-reload') } catch { /* ignore */ }
})

// React is about to mount — disarm the boot watchdog from index.html.
if (window.__bootTimer) {
  clearTimeout(window.__bootTimer)
  window.__bootTimer = null
}
// Hide the fallback in case the timer already fired (slow boot, not failure).
const _fb = document.getElementById('boot-fallback')
if (_fb) _fb.style.display = 'none'

// ---- Global unhandled error listeners ----
window.addEventListener('error', (event) => {
  logError(event.error ?? new Error(event.message), 'window.onerror')
})
window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, 'unhandledrejection')
})

// ---- Service Worker ----
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) {
      // Check for updates every hour while the tab is open.
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)
    }
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
