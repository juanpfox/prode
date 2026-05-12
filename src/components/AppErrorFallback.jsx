import { useTranslation } from 'react-i18next'

/**
 * Fallback UI shown when an uncaught error escapes to the root error boundary.
 * Mirrors the look of the pre-bundle fallback in index.html so the recovery
 * surface feels consistent regardless of where the failure happened.
 */
export default function AppErrorFallback({ resetError, eventId }) {
  const { t } = useTranslation()

  const reloadClean = () => {
    if (typeof window.__bustAndReload === 'function') window.__bustAndReload()
    else window.location.reload()
  }

  return (
    <div style={styles.wrap} role="alert">
      <h2 style={styles.title}>
        {t('errors.crash.title', 'Algo salió mal')}
      </h2>
      <p style={styles.body}>
        {t(
          'errors.crash.body',
          'Hubo un error inesperado. Probá reintentar; si sigue fallando, recargá limpio para borrar caché.'
        )}
      </p>
      <div style={styles.actions}>
        <button type="button" onClick={resetError} style={styles.btnSecondary}>
          {t('errors.crash.retry', 'Reintentar')}
        </button>
        <button type="button" onClick={reloadClean} style={styles.btnPrimary}>
          {t('errors.crash.reload', 'Recargar limpio')}
        </button>
      </div>
      {eventId && (
        <small style={styles.eventId}>
          ID: {String(eventId).slice(0, 8)}
        </small>
      )}
    </div>
  )
}

const styles = {
  wrap: {
    padding: '32px 20px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    textAlign: 'center',
    maxWidth: 480,
    margin: '80px auto',
  },
  title: { fontSize: '1.25rem', margin: '0 0 12px', fontWeight: 600 },
  body: { margin: '0 0 24px', opacity: 0.8, lineHeight: 1.5, fontSize: '0.95rem' },
  actions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: {
    background: '#16a34a', color: '#fff', border: 0,
    padding: '12px 28px', borderRadius: 10, fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', minHeight: 48,
  },
  btnSecondary: {
    background: 'transparent', color: 'inherit',
    border: '1px solid currentColor', padding: '12px 28px',
    borderRadius: 10, fontSize: '1rem', fontWeight: 600,
    cursor: 'pointer', minHeight: 48, opacity: 0.85,
  },
  eventId: {
    display: 'block', marginTop: 24, opacity: 0.5,
    fontSize: '0.7rem', fontFamily: 'ui-monospace, monospace',
  },
}
