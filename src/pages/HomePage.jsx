import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import TournamentCard from '../components/TournamentCard'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState([])
  const [myTournaments, setMyTournaments] = useState([])

  useEffect(() => {
    supabase.from('competitions').select('*').order('created_at')
      .then(({ data }) => setCompetitions(data ?? []))

    supabase.from('tournament_players')
      .select(`
        role, 
        tournaments(
          id, name, invite_code, mode, competition_id,
          competitions(name), 
          creator:users!tournaments_created_by_fkey(display_name),
          participants:tournament_players(count)
        )
      `)
      .eq('user_id', user.id).eq('status', 'approved')
      .then(({ data }) => setMyTournaments(data?.map(tp => ({ 
        ...tp.tournaments, 
        role: tp.role,
        creator_name: tp.tournaments.creator?.display_name,
        participants_count: tp.tournaments.participants?.[0]?.count ?? 0
      })).filter(Boolean) ?? []))
  }, [user])

  const EMOJI = { world_cup: '🏆', champions_league: '⭐', other: '🏟️' }
  const FLAG  = { world_cup: '🌍', champions_league: '🇪🇺', other: '🏟️' }

  return (
    <AppShell>
      <div className="home-welcome animate-fade-in">
        <h2 className="home-section-title">{t('home.competitions')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
      </div>

      {myTournaments.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {competitions.map(comp => (
            <CompetitionCard
              key={comp.id}
              emoji={EMOJI[comp.type] ?? '🏆'}
              name={comp.name}
              modes={comp.available_modes}
              status={comp.status}
              flag={FLAG[comp.type] ?? '🌍'}
              onCreateTournament={() => navigate(`/torneos?comp=${comp.id}`)}
            />
          ))}
        </div>
      )}

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{t('tournaments.title')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/torneos')}>
            {t('tournaments.create')}
          </button>
        </div>
        {myTournaments.length === 0 ? (
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>🏟️</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{t('tournaments.empty')}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/torneos')}>
              {t('tournaments.join')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myTournaments.map(tr => (
              <TournamentCard
                key={tr.id}
                tournament={tr}
                onDeleteSuccess={(id) => setMyTournaments(prev => prev.filter(t => t.id !== id))}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}

function CompetitionCard({ emoji, name, modes, status, flag, onCreateTournament }) {
  const { t } = useTranslation()
  const modeLabels = { posiciones: t('modes.posiciones'), partidos: t('modes.partidos') }
  return (
    <div className="competition-card card card-sm">
      <div className="competition-card-top">
        <span style={{ fontSize: '1.75rem' }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>{name}</p>
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
            {(modes ?? []).map(m => (
              <span key={m} className="badge badge-green">{modeLabels[m] ?? m}</span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: '1.25rem' }}>{flag}</span>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    active:   { key: 'competitions.status_active',   color: 'var(--primary)',    bg: 'var(--primary-subtle)' },
    upcoming: { key: 'competitions.status_upcoming',  color: 'var(--warning)',    bg: '#fef3c7' },
    finished: { key: 'competitions.status_finished',  color: 'var(--text-muted)', bg: 'var(--surface-3)' },
  }
  const s = map[status] ?? map.upcoming
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, background: s.bg,
        padding: '0.2rem 0.625rem', borderRadius: 'var(--r-full)' }}>
      {t(s.key)}
    </span>
  )
}
