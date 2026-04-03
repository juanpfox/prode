import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [myTournaments, setMyTournaments] = useState([])
  const [selected, setSelected] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingScores, setLoadingScores] = useState(false)

  useEffect(() => {
    supabase
      .from('tournament_players')
      .select('tournaments(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .then(({ data }) => {
        const ts = data?.map(tp => tp.tournaments).filter(Boolean) ?? []
        setMyTournaments(ts)
        if (ts.length > 0) setSelected(ts[0].id)
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (!selected) return
    setLoadingScores(true)
    supabase
      .from('scores')
      .select('user_id, total_points, users(display_name, avatar_url)')
      .eq('tournament_id', selected)
      .order('total_points', { ascending: false })
      .then(({ data }) => {
        setScores(data ?? [])
        setLoadingScores(false)
      })
  }, [selected])

  return (
    <AppShell>
      <div className="animate-fade-in">
        <h2 className="home-section-title" style={{ marginBottom: '1.25rem' }}>{t('nav.leaderboard')}</h2>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>{t('common.loading')}</p>
        ) : myTournaments.length === 0 ? (
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>📊</span>
            <p style={{ color: 'var(--text-muted)' }}>{t('tournaments.empty')}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {myTournaments.map(t_ => (
                <button
                  key={t_.id}
                  className={`btn btn-sm ${selected === t_.id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSelected(t_.id)}
                >
                  {t_.name}
                </button>
              ))}
            </div>

            {loadingScores ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>{t('common.loading')}</p>
            ) : scores.length === 0 ? (
              <div className="home-empty card card-sm">
                <span style={{ fontSize: '2rem' }}>🏁</span>
                <p style={{ color: 'var(--text-muted)' }}>{t('leaderboard.no_scores')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {scores.map((s, i) => (
                  <div
                    key={s.user_id}
                    className="card card-sm"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: s.user_id === user.id ? 'var(--primary-subtle)' : undefined,
                      border: s.user_id === user.id ? '1px solid var(--primary)' : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '1rem', width: '1.5rem', color: i < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{s.users?.display_name ?? 'Usuario'}</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{s.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
