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
  const [myTournaments, setMyTournaments] = useState([])
  const [publicTournaments, setPublicTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHome() {
      setLoading(true)
      try {
        const [{ data: myData }, { data: pubData }] = await Promise.all([
          supabase.from('tournament_players')
            .select(`
              role, 
              tournaments(
                id, name, invite_code, mode, competition_id, is_public, is_featured,
                competitions(name, type), 
                creator:users!tournaments_created_by_fkey(display_name),
                participants:tournament_players(count)
              )
            `)
            .eq('user_id', user.id).eq('status', 'approved'),
          supabase.from('tournaments')
            .select(`
              id, name, invite_code, mode, competition_id, is_public, is_featured,
              competitions(name, type),
              creator:users!tournaments_created_by_fkey(display_name),
              participants:tournament_players(count)
            `)
            .eq('is_public', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false }).limit(20)
        ])

        const myTs = myData?.map(tp => ({ 
          ...tp.tournaments, 
          role: tp.role,
          creator_name: tp.tournaments.creator?.display_name,
          participants_count: tp.tournaments.participants?.[0]?.count ?? 0
        })).filter(Boolean) ?? []
        
        setMyTournaments(myTs)

        // Filter public ones I'm not in
        const myIds = new Set(myTs.map(t => t.id))
        setPublicTournaments(pubData?.filter(t => !myIds.has(t.id)).map(t => ({
          ...t,
          creator_name: t.creator?.display_name,
          participants_count: t.participants?.[0]?.count ?? 0
        })).sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        }) ?? [])
      } finally {
        setLoading(false)
      }
    }
    loadHome()
  }, [user])

  const EMOJI = { world_cup: '🏆', champions_league: '⭐', other: '🏟️' }
  const FLAG  = { world_cup: '🌍', champions_league: '🇪🇺', other: '🏟️' }

  return (
    <AppShell>
      {(!loading && myTournaments.length > 0) && (
        <div style={{ marginTop: '0.4rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.625rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>{t('common.loading')}</p>
      ) : (
        <>
          {myTournaments.length === 0 ? (
            <>
              {publicTournaments.length > 0 && (
                <section className="animate-slide-up" style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '1.25rem', opacity: 0.9 }}>
                    {t('tournaments.select_to_play')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {publicTournaments.map(tr => (
                      <TournamentCard
                        key={tr.id}
                        tournament={tr}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {/* Section: My Tournaments */}
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                    {t('tournaments.title')} ({myTournaments.length})
                  </h3>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/torneos?new=1')}>
                    + {t('tournaments.create')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {myTournaments.map(tr => (
                    <TournamentCard
                      key={tr.id}
                      tournament={tr}
                      onDeleteSuccess={(id) => setMyTournaments(prev => prev.filter(t => t.id !== id))}
                    />
                  ))}
                </div>
              </section>

              {/* Section: Public Tournaments */}
              {publicTournaments.length > 0 && (
                <section className="animate-slide-up">
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '1.25rem', opacity: 0.9 }}>
                    {t('tournaments.tab_public')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {publicTournaments.map(tr => (
                      <TournamentCard
                        key={tr.id}
                        tournament={tr}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
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
