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
  const [myRole, setMyRole] = useState(null)
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

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
      const me = pls?.find(p => p.user_id === user.id)
      setMyRole(me?.role ?? null)
      setMyStatus(me?.status ?? null)
    } finally {
      setLoading(false)
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
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem' }}>{tournament.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {tournament.competitions?.name}
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
        </div>

        {/* Predictions CTA — approved players only */}
        {isApproved && modes.includes('partidos') && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem', fontSize: '1rem', padding: '0.875rem' }}
            onClick={() => navigate(`/torneo/${id}/pronosticos`)}>
            ⚽ {t('predictions.go_predict')}
          </button>
        )}

        {/* Pending approvals (admin only) */}
        {myRole === 'admin' && pending.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--warning)' }}>
              ⏳ {t('tournaments.pending_approval')} ({pending.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pending.map(p => (
                <div key={p.user_id} className="card card-sm"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{p.users?.display_name ?? 'Usuario'}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => approvePlayer(p.user_id)}>✓ {t('common.approve')}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => rejectPlayer(p.user_id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Players list */}
        {isApproved && (
          <section>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              👥 {t('tournaments.players_count', { count: approved.length })}
            </h3>
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
      </div>
    </AppShell>
  )
}
