import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import LangSelector from './LangSelector'
import { Avatar } from './AvatarSelector'
import WorldCupCountdown from './WorldCupCountdown'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'

export default function AppShell({ children, saveIndicator, wide }) {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isAdmin = user?.email === 'guest@prodemundial.dev' || user?.email === 'juanpatriciofox@gmail.com'
  const tournamentBasePath = getTournamentBasePath(pathname)
  if (tournamentBasePath) { try { sessionStorage.setItem('lastTournamentPath', tournamentBasePath) } catch { /* ignore */ } }
  const lastTournamentPath = tournamentBasePath || (() => { try { return sessionStorage.getItem('lastTournamentPath') } catch { return null } })()

  const [hasTournaments, setHasTournaments] = useState(true) // Default to true to avoid flicker

  useEffect(() => {
    if (!user) {
      setHasTournaments(false)
      return
    }
    supabase.from('tournament_players')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .then(({ count }) => {
        setHasTournaments(count > 0)
      })
  }, [user, pathname]) // Check on user change or navigation

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="app-header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: 0, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚽ <span>Prode Mundial</span>
          </div>
          <div className="show-mobile" style={{ marginTop: '-0.1rem', marginLeft: '1rem' }}>
            <WorldCupCountdown compact={true} hideAvatar={true} />
          </div>
        </div>
        <div className="app-header-actions">
          {saveIndicator === 'saving' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem', animation: 'fade-in 0.2s ease' }}>
              {t('predictions.saving_changes')}
            </span>
          )}
          {saveIndicator === 'saved' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginRight: '0.5rem', animation: 'fade-in 0.2s ease' }}>
              ✓ {t('predictions.all_changes_saved')}
            </span>
          )}
          <div className="hide-mobile">
            <WorldCupCountdown compact={true} />
          </div>
          <LangSelector />
          <ThemeToggle />
          {(user?.email === 'guest@prodemundial.dev' || user?.email === 'juanpatriciofox@gmail.com') && (
            <button className="btn btn-ghost btn-sm header-hide-mobile" onClick={() => navigate('/admin/resultados')}>
              🎯 {t('admin.results')}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/perfil')} style={{ paddingLeft: '0.25rem' }}>
            <Avatar id={profile?.avatar_url} size="xs" />
            <span className="header-hide-mobile" style={{ marginLeft: '0.4rem' }}>{profile?.display_name || t('nav.profile')}</span>
          </button>
        </div>
      </header>

      <main className={`app-content container ${wide ? 'container-full' : ''}`} style={{ paddingTop: wide ? '1rem' : '1.5rem' }}>
        {children}
      </main>

      <nav className="app-nav">
        {hasTournaments && lastTournamentPath && (
          <NavItem icon="⚽" label={t('nav.predictions')} active={pathname.endsWith('/pronosticos')} onClick={() => navigate(`${lastTournamentPath}/pronosticos`)} />
        )}
        {hasTournaments && lastTournamentPath && (
          <NavItem icon="📊" label={t('nav.standings')}   active={!!tournamentBasePath && pathname === tournamentBasePath} onClick={() => navigate(lastTournamentPath)} />
        )}
        <NavItem icon="🏆" label={t('nav.tournaments')} active={pathname === '/' || pathname.startsWith('/torneos')} onClick={() => navigate('/')} />
        {isAdmin && (
          <NavItem icon="🎯" label={t('nav.admin_results')} active={pathname.startsWith('/admin/resultados')} onClick={() => navigate('/admin/resultados')} />
        )}
      </nav>
    </div>
  )
}

const RESERVED_PATHS = new Set(['torneos', 'posiciones', 'perfil', 'admin', 'invitacion', 'login', 'registro', 'guest', 'guest2'])

function getTournamentBasePath(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  if (!segments.length) return null
  if (segments[0] === 'torneo' && segments[1]) return `/torneo/${segments[1]}`
  if (!RESERVED_PATHS.has(segments[0])) return `/${segments[0]}`
  return null
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
