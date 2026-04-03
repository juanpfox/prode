import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useTheme, applyRTL } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import PredictionsPage from './pages/PredictionsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'

function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <span style={{ fontSize: '2.5rem', animation: 'bounce-soft 1.5s ease-in-out infinite' }}>⚽</span>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{t('common.loading')}</p>
    </div>
  )
}

export default function App() {
  useTheme()
  const { i18n } = useTranslation()
  const { user, loading } = useAuth()
  useEffect(() => { applyRTL(i18n.language) }, [i18n.language])

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      {user ? (
        <Routes>
          <Route path="/"                             element={<HomePage />} />
          <Route path="/torneos"                      element={<TournamentsPage />} />
          <Route path="/torneo/:id"                   element={<TournamentDetailPage />} />
          <Route path="/torneo/:tournamentId/pronosticos" element={<PredictionsPage />} />
          <Route path="/ranking"                      element={<LeaderboardPage />} />
          <Route path="/perfil"                       element={<ProfilePage />} />
          <Route path="*"                             element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}
