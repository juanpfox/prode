import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function TournamentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [myTournaments, setMyTournaments] = useState([])
  const [publicTournaments, setPublicTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mine')
  const [showCreate, setShowCreate] = useState(!!searchParams.get('new'))
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', competition_id: '' })
  const [creating, setCreating] = useState(false)
  const [competitions, setCompetitions] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      // Mis torneos (donde soy jugador aprobado)
      const { data: myData } = await supabase
        .from('tournament_players')
        .select('role, status, tournaments(id, name, invite_code, competition_id, competitions(name, type))')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      setMyTournaments(myData?.map(tp => ({ ...tp.tournaments, role: tp.role })) ?? [])

      // Torneos públicos
      const { data: pubData } = await supabase
        .from('tournaments')
        .select('id, name, invite_code, competition_id, competitions(name, type)')
        .order('created_at', { ascending: false })
        .limit(20)

      setPublicTournaments(pubData ?? [])

      // Competiciones disponibles
      const { data: comps } = await supabase
        .from('competitions')
        .select('id, name, type, status')
        .order('name')

      setCompetitions(comps ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.competition_id) return
    setCreating(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tournaments')
        .insert({ name: createForm.name.trim(), competition_id: createForm.competition_id })
        .select('id')
        .single()

      if (err) throw err
      setShowCreate(false)
      setCreateForm({ name: '', competition_id: '' })
      await loadData()
      navigate(\`/torneo/${data.id}\`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    setError(null)
    try {
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .select('id, name')
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single()

      if (tErr || !tournament) throw new Error(t('tournaments.invalid_code'))

      const { error: pErr } = await supabase
        .from('tournament_players')
        .insert({ tournament_id: tournament.id, user_id: user.id, role: 'player', status: 'pending' })

      if (pErr && !pErr.message.includes('duplicate')) throw pErr

      setJoinCode('')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <AppShell>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 className="home-section-title" style={{ marginBottom: 0 }}>{t('nav.tournaments')}</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? '✕' : t('tournaments.create')}
          </button>
        </div>

        {error && (
          <div className="card card-sm" style={{ background: 'var(--error-subtle, #fee2e2)', color: 'var(--error, #dc2626)', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
            {error}
          </div>
        )}

        {showCreate && (
          <div className="card card-sm animate-slide-up" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('tournaments.create')}</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="input"
                placeholder={t('tournaments.name_placeholder')}
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <select
                className="input"
                value={createForm.competition_id}
                onChange={e => setCreateForm(f => ({ ...f, competition_id: e.target.value }))}
                required
              >
                <option value="">{t('tournaments.select_competition')}</option>
                {competitions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? t('common.loading') : t('tournaments.create')}
              </button>
            </form>
          </div>
        )}

        {/* Join by code */}
        <div className="card card-sm" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder={t('tournaments.enter_code')}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.1em' }}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={joining || !joinCode}>
              {joining ? '…' : t('tournaments.join_btn')}
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['mine', 'public'].map(k => (
            <button
              key={k}
              className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(k)}
            >
              {t(`tournaments.tab_${k}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>{t('common.loading')}</p>
        ) : tab === 'mine' ? (
          myTournaments.length === 0 ? (
            <div className="home-empty card card-sm">
              <span style={{ fontSize: '2rem' }}>🏟️</span>
              <p style={{ color: 'var(--text-muted)' }}>{t('tournaments.empty')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myTournaments.map(t_ => (
                <TournamentRow key={t_.id} tournament={t_} navigate={navigate} />
              ))}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {publicTournaments.map(t_ => (
              <TournamentRow key={t_.id} tournament={t_} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function TournamentRow({ tournament, navigate }) {
  return (
    <button
      className="card card-sm"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer' }}
      onClick={() => navigate(`/torneo/${tournament.id}`)}
    >
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{tournament.name}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
          {tournament.competitions?.name} · <span style={{ fontFamily: 'monospace' }}>{tournament.invite_code}</span>
        </p>
      </div>
      <span style={{ color: 'var(--text-subtle)', fontSize: '1.25rem' }}>›</span>
    </button>
  )
}
