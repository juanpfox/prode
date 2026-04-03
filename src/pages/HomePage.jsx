import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import './HomePage.css'

export default function HomePage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()

  return (
    <div className="home-page">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-logo">
          ⚽ <span>Prode</span> Mundial
        </div>
        <div className="app-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            {t('common.sign_out')}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="app-content container" style={{ paddingTop: '1.5rem' }}>
        {/* Welcome */}
        <div className="home-welcome animate-fade-in">
          <h2 className="home-section-title">{t('tournaments.title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
        </div>

        {/* Competitions */}
        <div className="home-competitions animate-slide-up">
          <CompetitionCard
            emoji="🏆"
            name="World Cup 2026"
            modes={[t('modes.posiciones'), t('modes.partidos')]}
            status="upcoming"
            flag="🌍"
          />
          <CompetitionCard
            emoji="⭐"
            name="UEFA Champions League 2024/25"
            modes={[t('modes.partidos')]}
            status="active"
            flag="🇪🇺"
          />
        </div>

        {/* My Tournaments */}
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{t('tournaments.title')}</h3>
            <button className="btn btn-primary btn-sm">{t('tournaments.create')}</button>
          </div>
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>🏟️</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{t('tournaments.empty')}</p>
            <button className="btn btn-ghost btn-sm">{t('tournaments.join')}</button>
          </div>
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="app-nav">
        <NavItem icon="🏠" label={t('nav.home')} active />
        <NavItem icon="🏆" label={t('nav.tournaments')} />
        <NavItem icon="📊" label={t('nav.leaderboard')} />
        <NavItem icon="👤" label={t('nav.profile')} />
      </nav>
    </div>
  )
}

function CompetitionCard({ emoji, name, modes, status, flag }) {
  const { t } = useTranslation()
  return (
    <div className="competition-card card card-sm">
      <div className="competition-card-top">
        <span style={{ fontSize: '1.75rem' }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>{name}</p>
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
            {modes.map(m => <span key={m} className="badge badge-green">{m}</span>)}
          </div>
        </div>
        <span style={{ fontSize: '1.25rem' }}>{flag}</span>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusBadge status={status} />
        <button className="btn btn-primary btn-sm">{t('competitions.create_tournament')}</button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const map = {
    active:   { key: 'competitions.status_active',   color: 'var(--primary)',   bg: 'var(--primary-subtle)' },
    upcoming: { key: 'competitions.status_upcoming',  color: 'var(--warning)',   bg: '#fef3c7' },
    finished: { key: 'competitions.status_finished',  color: 'var(--text-muted)', bg: 'var(--surface-3)' },
  }
  const s = map[status] ?? map.upcoming
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, background: s.bg, padding: '0.2rem 0.625rem', borderRadius: 'var(--r-full)' }}>
      {t(s.key)}
    </span>
  )
}

function NavItem({ icon, label, active }) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`}>
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
