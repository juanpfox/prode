import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../components/AppShell'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="home-welcome animate-fade-in">
        <h2 className="home-section-title">{t('tournaments.title')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
      </div>

      <div className="home-competitions animate-slide-up" style={{ marginTop: '1.25rem' }}>
        <CompetitionCard
          emoji="🏆"
          name="World Cup 2026"
          modes={[t('modes.posiciones'), t('modes.partidos')]}
          status="upcoming"
          flag="🌍"
          onCreateTournament={() => navigate('/torneos?new=wc2026')}
        />
        <CompetitionCard
          emoji="⭐"
          name="UEFA Champions League 2024/25"
          modes={[t('modes.partidos')]}
          status="active"
          flag="🇪🇺"
          onCreateTournament={() => navigate('/torneos?new=ucl2425')}
        />
      </div>

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{t('tournaments.title')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/torneos')}>
            {t('tournaments.create')}
          </button>
        </div>
        <div className="home-empty card card-sm">
          <span style={{ fontSize: '2rem' }}>🏟️</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{t('tournaments.empty')}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/torneos')}>
            {t('tournaments.join')}
          </button>
        </div>
      </section>
    </AppShell>
  )
}

function CompetitionCard({ emoji, name, modes, status, flag, onCreateTournament }) {
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
        <button className="btn btn-primary btn-sm" onClick={onCreateTournament}>
          {t('competitions.create_tournament')}
        </button>
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
