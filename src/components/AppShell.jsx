import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import LangSelector from './LangSelector'

export default function AppShell({ children, saveIndicator }) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="app-header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          ⚽ <span>Prode</span> <span className="hide-on-mobile">Mundial</span>
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
          <LangSelector />
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            {t('common.sign_out')}
          </button>
        </div>
      </header>

      <main className="app-content container" style={{ paddingTop: '1.5rem' }}>
        {children}
      </main>

      <nav className="app-nav">
        <NavItem icon="🏠" label={t('nav.home')}        active={pathname === '/'}               onClick={() => navigate('/')} />
        <NavItem icon="🏆" label={t('nav.tournaments')} active={pathname.startsWith('/torneo')} onClick={() => navigate('/torneos')} />
        <NavItem icon="📊" label={t('nav.leaderboard')} active={pathname === '/ranking'}        onClick={() => navigate('/ranking')} />
        <NavItem icon="👤" label={t('nav.profile')}     active={pathname === '/perfil'}         onClick={() => navigate('/perfil')} />
      </nav>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
