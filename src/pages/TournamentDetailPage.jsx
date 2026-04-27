import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import ConfigTab from '../components/ConfigTab'
import RulesPage from '../components/RulesPage'

const RESERVED_SLUGS = ['perfil', 'posiciones', 'torneos', 'admin', 'login', 'registro', 'invitacion', 'guest', 'guest2', 'perfil-publico']

export default function TournamentDetailPage() {
  const { t } = useTranslation()
  const { id: paramId, slug: paramSlug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])
  const [tab, setTab] = useState('leaderboard') // 'leaderboard' | 'rules' | 'config'
  const [myRole, setMyRole] = useState(null)
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showInviteCode, setShowInviteCode] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editPrize, setEditPrize] = useState('')
  const [showBanned, setShowBanned] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const id = tournament?.id

  useEffect(() => { loadTournament() }, [paramId, paramSlug])

  async function loadTournament() {
    setLoading(true)
    try {
      const identifier = paramId || paramSlug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
      
      let query = supabase
        .from('tournaments')
        .select('*, competitions(name, type, status, available_modes)')
      
      if (isUUID) {
        query = query.eq('id', identifier)
      } else {
        query = query.eq('slug', identifier)
      }

      const { data: tr } = await query.single()
      
      if (!tr) {
        setTournament(null)
        return
      }

      const id = tr.id
      setTournament(tr)
      setEditName(tr.name ?? '')
      setEditSlug(tr.slug ?? '')
      setEditPrize(tr.prize ?? '')

      const { data: pls } = await supabase
        .from('tournament_players')
        .select('user_id, role, status, users(display_name)')
        .eq('tournament_id', id)
      setPlayers(pls ?? [])

      const { data: scs } = await supabase
        .from('scores')
        .select('user_id, total_points, matches_scored, users(display_name)')
        .eq('tournament_id', id)

      // Merge scores with approved players to show everyone even with 0 points
      const approvedPlayers = pls?.filter(p => p.status === 'approved') ?? []
      const mergedScores = approvedPlayers.map(p => {
        const scoreEntry = scs?.find(s => s.user_id === p.user_id)
        return {
          user_id: p.user_id,
          total_points: scoreEntry?.total_points ?? 0,
          matches_scored: scoreEntry?.matches_scored ?? 0,
          users: { display_name: p.users?.display_name ?? 'Usuario' }
        }
      }).sort((a, b) => b.total_points - a.total_points || a.users.display_name.localeCompare(b.users.display_name))

      setScores(mergedScores)

      const me = pls?.find(p => p.user_id === user.id)
      let myCurrentStatus = me?.status ?? null

      if (myCurrentStatus === 'pending' && !tr.requires_approval) {
        await supabase.from('tournament_players')
          .update({ status: 'approved' })
          .eq('tournament_id', id)
          .eq('user_id', user.id)
        myCurrentStatus = 'approved'
        if (me) me.status = 'approved'
      }

      setMyRole(me?.role ?? null)
      setMyStatus(myCurrentStatus)
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
        .eq('id', tournament.id)
      if (error) throw error
      setTournament(prev => ({ ...prev, is_public: isPublic }))
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function updateName() {
    if (!editName.trim() || editName === tournament.name) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ name: editName.trim() })
        .eq('id', tournament.id)
      if (error) throw error
      setTournament(prev => ({ ...prev, name: editName.trim() }))
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  const [slugStatus, setSlugStatus] = useState(null) // null | 'checking' | 'available' | 'taken'
  const [slugSuggestion, setSlugSuggestion] = useState(null)

  useEffect(() => {
    const slugValue = editSlug.trim().toLowerCase()
    if (!slugValue || slugValue === (tournament?.slug ?? '')) {
      setSlugStatus(null)
      setSlugSuggestion(null)
      return
    }
    
    if (RESERVED_SLUGS.includes(slugValue)) {
      setSlugStatus('taken')
      setSlugSuggestion(slugValue + '_1')
      return
    }

    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('id')
          .eq('slug', slugValue)
          .neq('id', tournament.id)
          .maybeSingle()
        
        if (error) throw error
        if (data) {
          setSlugStatus('taken')
          setSlugSuggestion(slugValue + '_1')
        } else {
          setSlugStatus('available')
          setSlugSuggestion(null)
        }
      } catch {
        setSlugStatus(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [editSlug, tournament?.id])

  async function updateSlug() {
    const slugValue = editSlug.trim().toLowerCase()
    if (slugValue === (tournament.slug ?? '')) return
    if (slugStatus === 'taken') return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ slug: slugValue || null })
        .eq('id', tournament.id)
      if (error) {
        if (error.code === '23505') throw new Error(t('tournaments.slug_error_taken'))
        throw error
      }
      setTournament(prev => ({ ...prev, slug: slugValue || null }))
      // If we are on the slug route, we might want to navigate to the new slug
      if (paramSlug) {
        navigate(`/${slugValue || tournament.id}`, { replace: true })
      }
    } catch (err) {
      alert(err.message || t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function updatePrize() {
    const trimmed = editPrize.trim()
    if (trimmed === (tournament.prize ?? '')) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ prize: trimmed || null })
        .eq('id', tournament.id)
      if (error) throw error
      setTournament(prev => ({ ...prev, prize: trimmed || null }))
    } catch {
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
      if (!requires) {
        await supabase.from('tournament_players')
          .update({ status: 'approved' })
          .eq('tournament_id', id)
          .eq('status', 'pending')
        loadTournament()
      }
    } catch {
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
    } catch {
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

  async function banPlayer(userId) {
    if (!window.confirm(t('tournaments.confirm_ban'))) return
    setUpdating(true)
    try {
      const { error } = await supabase.rpc('ban_tournament_player', {
        p_tournament_id: id,
        p_user_id: userId,
      })
      if (error) throw error
      loadTournament()
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function unbanPlayer(userId) {
    setUpdating(true)
    try {
      const { error } = await supabase.rpc('unban_tournament_player', {
        p_tournament_id: id,
        p_user_id: userId,
      })
      if (error) throw error
      loadTournament()
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function reinvitePlayer(userId) {
    setUpdating(true)
    try {
      const { error } = await supabase.rpc('reinvite_tournament_player', {
        p_tournament_id: id,
        p_user_id: userId,
      })
      if (error) throw error
      loadTournament()
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
    }
  }

  async function leaveTournament() {
    setUpdating(true)
    try {
      const { error } = await supabase.rpc('leave_tournament', {
        p_tournament_id: id,
      })
      if (error) throw error
      navigate('/')
    } catch {
      alert(t('common.error_generic'))
    } finally {
      setUpdating(false)
      setConfirmLeave(false)
    }
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
    } catch {
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

  const approved = players.filter(p => p.status === 'approved')
  const pending  = players.filter(p => p.status === 'pending')
  const banned   = players.filter(p => p.status === 'banned')
  const isApproved = myStatus === 'approved'
  const isPending  = myStatus === 'pending'
  const isBanned   = myStatus === 'banned'

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>
          ← {t('common.back')}
        </button>

        {/* Header */}
        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
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
            </div>
            {/* Invite code icon */}
            {tournament.invite_code && isApproved && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowInviteCode(v => !v)}
                title={t('tournaments.invite_code')}
                style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <span>📨</span>
                <span>{showInviteCode ? t('common.close') : t('tournaments.invite_btn')}</span>
              </button>
            )}
          </div>

          {/* Invite code — expandible */}
          {showInviteCode && tournament.invite_code && (
            <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '0.625rem 0.875rem',
                animation: 'fade-in 0.15s ease both' }}>
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

          {isBanned && (
            <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: '#fee2e2',
                borderRadius: 'var(--r-md)', color: '#991b1b', fontSize: '0.875rem' }}>
              🚫 {t('tournaments.banned_msg')}
            </div>
          )}

          {isPending && (
            <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: '#fef3c7',
                borderRadius: 'var(--r-md)', color: '#92400e', fontSize: '0.875rem' }}>
              ⏳ {t('tournaments.pending_msg')}
            </div>
          )}

          {!isApproved && !isPending && !isBanned && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.875rem' }}
              onClick={joinTournament} disabled={updating}>
              {updating ? '…' : t('tournaments.join_btn')}
            </button>
          )}
        </div>

        {/* Predictions CTA */}
        {isApproved && (tournament.mode === 'partidos' || tournament.mode === 'posiciones') && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem', fontSize: '1rem', padding: '0.875rem' }}
            onClick={() => navigate(`/${tournament.slug || tournament.id}/pronosticos`)}>
            {tournament.mode === 'posiciones' ? '🏆' : '⚽'} {t('predictions.go_predict')}
          </button>
        )}

        {/* Tabs: Posiciones | Reglas | Configuración (admin) */}
        {isApproved && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', paddingBottom: '0.25rem', overflowX: 'auto' }}>
              {['leaderboard', 'rules', ...(myRole === 'admin' ? ['config'] : [])].map(tId => (
                <button
                  key={tId}
                  className={`btn btn-sm ${tab === tId ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderBottom: tab === tId ? '2px solid var(--primary)' : 'none', borderRadius: 0, whiteSpace: 'nowrap' }}
                  onClick={() => setTab(tId)}
                >
                  {tId === 'leaderboard' ? '📊' : tId === 'rules' ? '📖' : '⚙️'}
                  <span style={{ marginLeft: '0.4rem' }}>
                    {tId === 'leaderboard' ? t('nav.leaderboard')
                      : tId === 'rules' ? t('config.tab_rules')
                      : t('actions.settings')}
                  </span>
                </button>
              ))}
            </div>

            {/* LEADERBOARD TAB */}
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
                        onClick={() => navigate(`/${tournament.slug || tournament.id}/jugador/${s.user_id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
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

            {tab === 'rules' && (
              <section className="animate-slide-up">
                <RulesPage tournamentId={id} mode={tournament.mode} />
              </section>
            )}

            {/* CONFIG TAB (admin only) — settings + scoring + players */}
            {tab === 'config' && myRole === 'admin' && (
              <section className="animate-slide-up">

                {/* Tournament settings: name, prize, visibility, join method */}
                <div className="card card-sm" style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('tournaments.tournament_name')}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      className="input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={t('tournaments.name_placeholder')}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={updateName}
                      disabled={updating || !editName.trim() || editName === tournament.name}
                    >
                      {updating ? '…' : t('common.save')}
                    </button>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                    {t('tournaments.slug_label', 'URL del torneo')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="input" style={{ 
                        flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.25rem', paddingRight: '0.5rem',
                        border: slugStatus === 'taken' ? '1px solid var(--error, #dc2626)' : 
                                slugStatus === 'available' ? '1px solid var(--success, #16a34a)' : undefined,
                        minWidth: 0
                      }}>
                        <span className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', userSelect: 'none', whiteSpace: 'nowrap' }}>prodemundial.pages.dev/</span>
                        <span className="show-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', userSelect: 'none', whiteSpace: 'nowrap' }}>prode.../</span>
                        <input
                          style={{ flex: 1, background: 'none', border: 'none', color: 'inherit', fontSize: '0.9rem', padding: 0, outline: 'none', minWidth: 0 }}
                          value={editSlug}
                          onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          placeholder={t('tournaments.slug_placeholder')}
                        />
                        {slugStatus === 'checking' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>…</span>}
                        {slugStatus === 'available' && <span style={{ fontSize: '0.75rem', color: 'var(--success, #16a34a)' }}>✓</span>}
                        {slugStatus === 'taken' && <span style={{ fontSize: '0.75rem', color: 'var(--error, #dc2626)' }}>✕</span>}
                        
                        <button 
                          className="btn-icon-action" 
                          title="Copiar URL"
                          onClick={() => {
                            const url = `https://prodemundial.pages.dev/${editSlug || tournament.id}`
                            navigator.clipboard.writeText(url)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          style={{ padding: '0.25rem', color: copied ? 'var(--primary)' : 'inherit', flexShrink: 0 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={updateSlug}
                        style={{ flex: window.innerWidth < 480 ? '1' : 'none' }}
                        disabled={updating || editSlug.trim().toLowerCase() === (tournament.slug ?? '') || slugStatus === 'taken' || slugStatus === 'checking'}
                      >
                        {updating ? '…' : t('common.save')}
                      </button>
                    </div>
                    {slugStatus === 'taken' && (
                      <div style={{ marginLeft: '0.5rem', marginTop: '0.25rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--error, #dc2626)', margin: 0 }}>
                          ⚠️ {t('tournaments.slug_error_taken', 'Esta URL ya está en uso')}
                        </p>
                        {slugSuggestion && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                            {t('tournaments.slug_suggestion', 'Sugerencia:')} {' '}
                            <span 
                              style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => setEditSlug(slugSuggestion)}
                            >
                              {slugSuggestion}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem', lineHeight: 1.4 }}>
                      {t('tournaments.slug_help_full', 'El torneo será accesible en:')} <br/>
                      <strong style={{ color: 'var(--primary)' }}>prodemundial.pages.dev/{editSlug || tournament.id}</strong>
                    </p>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                    {t('tournaments.prize_label', 'Premio para el ganador')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input"
                      value={editPrize}
                      onChange={e => setEditPrize(e.target.value.slice(0, 100))}
                      placeholder={t('tournaments.prize_placeholder')}
                      maxLength={100}
                      style={{ flex: 1, fontSize: '0.9rem' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={updatePrize}
                      disabled={updating || editPrize.trim() === (tournament.prize ?? '')}
                    >
                      {updating ? '…' : t('common.save')}
                    </button>
                  </div>
                  {editPrize.trim() && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'right' }}>
                      {editPrize.trim().length}/100
                    </p>
                  )}
                </div>

                <div className="card card-sm" style={{ marginBottom: '1rem' }}>
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

                <div className="card card-sm" style={{ marginBottom: '1rem' }}>
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

                {/* Scoring config — points & multipliers */}
                <ConfigTab tournamentId={id} isAdmin={true} mode={tournament.mode} />

                {/* Players management */}
                <div style={{ marginTop: '1rem' }}>
                  {/* Pending approvals */}
                  {pending.length > 0 && (
                    <div className="card card-sm" style={{ marginBottom: '0.75rem', border: '1px dashed var(--warning)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⏳ {t('tournaments.pending_approval')} ({pending.length})
                        </h4>
                        <button className="btn btn-ghost btn-sm" onClick={approveAllPlayers} disabled={updating}>
                          {t('tournaments.approve_all')}
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pending.map(p => (
                          <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.users?.display_name ?? 'Usuario'}</span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => approvePlayer(p.user_id)} style={{ padding: '0.25rem 0.6rem' }}>✓</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => rejectPlayer(p.user_id)} style={{ padding: '0.25rem 0.6rem' }}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approved players */}
                  <div className="card card-sm">
                    <h4 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      👥 {t('tournaments.tab_mine')} ({approved.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {approved.map((p) => (
                        <div key={p.user_id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>
                            {p.users?.display_name ?? 'Usuario'}
                            {p.user_id === user.id && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({t('common.you')})
                              </span>
                            )}
                          </span>
                          <span className={`badge ${p.role === 'admin' ? 'badge-green' : 'badge-gray'}`}>{p.role}</span>
                          {p.user_id !== user.id && p.role !== 'admin' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => banPlayer(p.user_id)}
                              disabled={updating}
                              title={t('tournaments.ban_player')}
                              style={{ padding: '0.25rem 0.5rem', color: 'var(--error, #ef4444)' }}
                            >
                              🚫
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Banned list */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowBanned(v => !v)}
                      style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                    >
                      <span>🚫 {t('tournaments.banned_list')} ({banned.length})</span>
                      <span>{showBanned ? '▲' : '▼'}</span>
                    </button>

                    {showBanned && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {banned.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                            {t('tournaments.no_banned')}
                          </p>
                        ) : (
                          banned.map(p => (
                            <div key={p.user_id} className="card card-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--error, #ef4444)', opacity: 0.85 }}>
                              <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-muted)' }}>
                                🚫 {p.users?.display_name ?? 'Usuario'}
                              </span>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => unbanPlayer(p.user_id)}
                                  disabled={updating}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  🔓 {t('tournaments.unban_player')}
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => reinvitePlayer(p.user_id)}
                                  disabled={updating}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  📨 {t('tournaments.reinvite_player')}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </section>
            )}

            {/* Leave tournament — player only (not admin), shown below posiciones */}
            {tab === 'leaderboard' && myRole !== 'admin' && (
              <div style={{ marginTop: '2rem' }}>
                {!confirmLeave ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmLeave(true)}
                    style={{ color: 'var(--error, #ef4444)', border: '1px solid var(--error, #ef4444)', width: '100%' }}
                  >
                    {t('tournaments.leave_tournament')}
                  </button>
                ) : (
                  <div className="card card-sm" style={{ border: '1px solid var(--error, #ef4444)', textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                      {t('tournaments.confirm_leave')}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmLeave(false)}>
                        {t('common.cancel')}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={leaveTournament}
                        disabled={updating}
                        style={{ background: 'var(--error, #ef4444)', color: '#fff', border: 'none' }}
                      >
                        {updating ? '…' : t('tournaments.leave_confirm_btn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
