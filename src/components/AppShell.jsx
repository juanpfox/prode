import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import LangSelector from './LangSelector'

export default function AppShell({ children }) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="app-header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          ⚽ <span>Prode</span> Mundial
        </div>
        <div className="app-header-actions">
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
        <NavItem icon="🏠" label={t('nav.home')}        path="/"              active={pathname === '/'}               onClick={() => navigate('/')} />
        <NavItem icon="🏆" label={t('nav.tournaments')} path="/torneos"       active={pathname.startsWith('/torneo')} onClick={() => navigate('/torneos')} />
        <NavItem icon="📊" label={t('nav.leaderboard')} path="/ranking"       active={pathname === '/ranking'}        onClick={() => navigate('/ranking')} />
        <NavItem icon="👤" label={t('nav.profile')}     path="/perfil"        active={pathname === '/perfil'}         onClick={() => navigate('/perfil')} />
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
