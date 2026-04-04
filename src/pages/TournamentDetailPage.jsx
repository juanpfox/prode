import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function TournamentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])
  const [tab, setTab] = useState('leaderboard') // 'leaderboard' | 'players' | 'settings'
  const [myRole, setMyRole] = useState(null)
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { loadTournament() }, [id])

  async function loadTournament() {
    setLoading(true)
    try {
      const { data: tr } = await supabase
        .from('tournaments')
        .select('*, competitions(name, type, status, available_modes)')
        .eq('id', id).single()
      setTournament(tr)

      const { data: pls } = await supabase
        .from('tournament_players')
        .select('user_id, role, status, users(display_name)')
        .eq('tournament_id', id)
      setPlayers(pls ?? [])

      const { data: scs } = await supabase
        .from('scores')
        .select('user_id, total_points, matches_scored, users(display_name)')
        .eq('tournament_id', id)
        .order('total_points', { ascending: false })
      setScores(scs ?? [])

      const me = pls?.find(p => p.user_id === user.id)
      setMyRole(me?.role ?? null)
      setMyStatus(me?.status ?? null)
    } finally {
      setLoading(false)
    }
  }

  async function updateVisibility(isPublic) {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ is_public: isPublic })
        .eq('id', id)
      if (error) throw error
      setTournament(prev => ({ ...prev, is_public: isPublic }))
    } catch (err) {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function updateApproval(requires) {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ requires_approval: requires })
        .eq('id', id)
      if (error) throw error
      setTournament(prev => ({ ...prev, requires_approval: requires }))
    } catch (err) {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function approveAllPlayers() {
    setUpdating(true)
    try {
      const { error } = await supabase.from('tournament_players')
        .update({ status: 'approved' })
        .eq('tournament_id', id).eq('status', 'pending')
      if (error) throw error
      loadTournament()
    } catch (err) {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function approvePlayer(userId) {
    await supabase.from('tournament_players')
      .update({ status: 'approved' })
      .eq('tournament_id', id).eq('user_id', userId)
    loadTournament()
  }

  async function rejectPlayer(userId) {
    await supabase.from('tournament_players')
      .update({ status: 'rejected' })
      .eq('tournament_id', id).eq('user_id', userId)
    loadTournament()
  }

  async function joinTournament() {
    setUpdating(true)
    try {
      const { error } = await supabase.from('tournament_players')
        .insert({
          tournament_id: id,
          user_id: user.id,
          role: 'player',
          status: tournament.requires_approval ? 'pending' : 'approved'
        })
      if (error) throw error
      loadTournament()
    } catch (err) {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(tournament.invite_code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )
  if (!tournament) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('tournaments.not_found')}</p>
    </AppShell>
  )

  const approved  = players.filter(p => p.status === 'approved')
  const pending   = players.filter(p => p.status === 'pending')
  const isApproved = myStatus === 'approved'
  const isPending  = myStatus === 'pending'
  const modes = tournament.competitions?.available_modes ?? []

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
          ← {t('common.back')}
        </button>

        {/* Header */}
        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text)' }}>{tournament.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {tournament.competitions?.name}
            {tournament.mode && (
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                background: 'var(--primary-subtle)', color: 'var(--primary)',
                borderRadius: '4px', padding: '0.1rem 0.4rem'
              }}>
                {tournament.mode === 'posiciones' ? `🏆 ${t('modes.posiciones_full')}` : `⚽ ${t('modes.partidos_full')}`}
              </span>
            )}
          </p>

          {tournament.invite_code && (
            <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '0.625rem 0.875rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  {t('tournaments.invite_code')}
                </p>
                <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem',
                    color: 'var(--primary)', letterSpacing: '0.15em' }}>
                  {tournament.invite_code}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={copyCode}>{copied ? '✓' : '📋'}</button>
            </div>
          )}

          {isPending && (
            <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: '#fef3c7',
                borderRadius: 'var(--r-md)', color: '#92400e', fontSize: '0.875rem' }}>
              ⏳ {t('tournaments.pending_msg')}
            </div>
          )}

          {!isApproved && !isPending && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.875rem' }}
              onClick={joinTournament} disabled={updating}>
              {updating ? '…' : t('tournaments.join_btn')}
            </button>
          )}
        </div>

        {/* Predictions CTA — approved players only */}
        {isApproved && (tournament.mode === 'partidos' || tournament.mode === 'posiciones') && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem', fontSize: '1rem', padding: '0.875rem' }}
            onClick={() => navigate(`/torneo/${id}/pronosticos`)}>
            {tournament.mode === 'posiciones' ? '🏆' : '⚽'} {t('predictions.go_predict')}
          </button>
        )}

        {/* Tabs — only for approved users */}
        {isApproved && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', paddingBottom: '0.25rem' }}>
              {['leaderboard', 'players', ...(myRole === 'admin' ? ['settings'] : [])].map(tId => (
                <button
                  key={tId}
                  className={`btn btn-sm ${tab === tId ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderBottom: tab === tId ? '2px solid var(--primary)' : 'none', borderRadius: 0 }}
                  onClick={() => setTab(tId)}
                >
                  {tId === 'leaderboard' ? '📊' : tId === 'players' ? '👥' : '⚙️'} 
                  <span style={{ marginLeft: '0.4rem' }}>{tId === 'leaderboard' ? t('nav.leaderboard') : tId === 'players' ? t('tournaments.tab_mine') : t('actions.settings')}</span>
                </button>
              ))}
            </div>

            {tab === 'leaderboard' && (
              <section>
                {scores.length === 0 ? (
                  <div className="home-empty card card-sm">
                    <span style={{ fontSize: '2rem' }}>🏁</span>
                    <p style={{ color: 'var(--text-muted)' }}>{t('leaderboard.no_scores')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {scores.map((s, i) => (
                      <div key={s.user_id} className="card card-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                          background: s.user_id === user.id ? 'var(--primary-subtle)' : undefined,
                          border: s.user_id === user.id ? '1px solid var(--primary)' : undefined }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', width: '1.75rem', textAlign: 'center' }}>
                          {['🥇', '🥈', '🥉'][i] ?? i + 1}
                        </span>
                        <span style={{ flex: 1, fontWeight: 600 }}>{s.users?.display_name ?? 'Usuario'}</span>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                            {s.total_points} pts
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {s.matches_scored} {t('leaderboard.matches')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === 'players' && (
              <section>
                {/* Pending approvals (admin only) */}
                {myRole === 'admin' && pending.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--warning)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ⏳ {t('tournaments.pending_approval')} ({pending.length})
                      </h4>
                      <button className="btn btn-ghost btn-sm" onClick={approveAllPlayers} disabled={updating}>
                        {t('tournaments.approve_all')}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {pending.map(p => (
                        <div key={p.user_id} className="card card-sm"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed var(--warning)' }}>
                          <span style={{ fontWeight: 600 }}>{p.users?.display_name ?? 'Usuario'}</span>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => approvePlayer(p.user_id)} style={{ padding: '0.25rem 0.6rem' }}>✓</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => rejectPlayer(p.user_id)} style={{ padding: '0.25rem 0.6rem' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {approved.map((p, i) => (
                    <div key={p.user_id} className="card card-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: p.user_id === user.id ? 'var(--primary-subtle)' : undefined,
                        border: p.user_id === user.id ? '1px solid var(--primary)' : undefined }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', width: '1.25rem' }}>{i + 1}</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>
                        {p.users?.display_name ?? 'Usuario'}
                        {p.user_id === user.id && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({t('common.you')})
                          </span>
                        )}
                      </span>
                      <span className={`badge ${p.role === 'admin' ? 'badge-green' : 'badge-gray'}`}>{p.role}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === 'settings' && myRole === 'admin' && (
              <section className="animate-slide-up">
                <div className="card card-sm">
                  <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>{t('tournaments.visibility')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[false, true].map(v => (
                      <button
                        key={String(v)}
                        disabled={updating}
                        onClick={() => updateVisibility(v)}
                        style={{
                          padding: '1rem', borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                          border: tournament.is_public === v ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: tournament.is_public === v ? 'var(--primary-subtle)' : 'var(--surface-2)'
                        }}
                      >
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', color: tournament.is_public === v ? 'var(--primary)' : 'var(--text)', marginBottom: '0.25rem' }}>
                          {v ? '🌐' : '🔒'} {t(v ? 'tournaments.public' : 'tournaments.private')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {t(v ? 'tournaments.public_desc' : 'tournaments.private_desc')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card card-sm" style={{ marginTop: '1rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>{t('tournaments.join_method')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[false, true].map(v => (
                      <button
                        key={String(v)}
                        disabled={updating}
                        onClick={() => updateApproval(v)}
                        style={{
                          padding: '1rem', borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                          border: tournament.requires_approval === v ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: tournament.requires_approval === v ? 'var(--primary-subtle)' : 'var(--surface-2)'
                        }}
                      >
                        <p style={{ fontWeight: 800, fontSize: '0.9rem', color: tournament.requires_approval === v ? 'var(--primary)' : 'var(--text)', marginBottom: '0.25rem' }}>
                          {v ? '✋' : '✅'} {t(v ? 'tournaments.approval_required' : 'tournaments.auto_join')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {t(v ? 'tournaments.approval_required_desc' : 'tournaments.auto_join_desc')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
