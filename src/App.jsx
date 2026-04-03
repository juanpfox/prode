import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { applyRTL } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <span style={{ fontSize: '2.5rem', animation: 'bounce-soft 1.5s ease-in-out infinite' }}>⚽</span>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{t('common.loading')}</p>
    </div>
  )
}

export default function App() {
  // Initialize theme on mount (in case React renders before the inline script)
  useTheme()

  const { i18n } = useTranslation()
  const { user, loading } = useAuth()

  // Sync RTL when language changes
  useEffect(() => {
    applyRTL(i18n.language)
  }, [i18n.language])

  if (loading) return <LoadingScreen />
  if (!user)   return <LoginPage />
  return <HomePage />
}
