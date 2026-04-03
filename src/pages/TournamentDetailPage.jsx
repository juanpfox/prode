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
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTournament() }, [id])

  async function loadTournament() {
    setLoading(true)
    try {
      const { data: t_ } = await supabase
        .from('tournaments')
        .select('*, competitions(name, type, status)')
        .eq('id', id)
        .single()
      setTournament(t_)

      const { data: pls } = await supabase
        .from('tournament_players')
        .select('user_id, role, status, users(display_name, avatar_url)')
        .eq('tournament_id', id)

      setPlayers(pls ?? [])
      const me = pls?.find(p => p.user_id === user.id)
      setMyRole(me?.role ?? null)
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

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  if (!tournament) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Torneo no encontrado</p>
    </AppShell>
  )

  const approved = players.filter(p => p.status === 'approved')
  const pending  = players.filter(p => p.status === 'pending')

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
          ← {t('common.back')}
        </button>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem' }}>{tournament.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {tournament.competitions?.name}
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('tournaments.invite_code')}:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', letterSpacing: '0.1em' }}>
              {tournament.invite_code}
            </span>
          </div>
        </div>

        {myRole === 'admin' && pending.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--warning)' }}>
              ⏳ {t('tournaments.pending_approval')} ({pending.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pending.map(p => (
                <div key={p.user_id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{p.users?.display_name ?? 'Usuario'}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => approvePlayer(p.user_id)}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => rejectPlayer(p.user_id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            👥 {t('tournaments.players')} ({approved.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {approved.map(p => (
              <div key={p.user_id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{p.users?.display_name ?? 'Usuario'}</span>
                <span className={`badge ${p.role === 'admin' ? 'badge-green' : 'badge-gray'}`}>{p.role}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
