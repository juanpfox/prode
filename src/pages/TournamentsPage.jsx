import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import TournamentCard from '../components/TournamentCard'
import ConfigTab from '../components/ConfigTab'
import '../components/config-rules.css'

export default function TournamentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [myTournaments, setMyTournaments] = useState([])
  const [publicTournaments, setPublicTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mine')
  const [showCreate, setShowCreate] = useState(!!searchParams.get('comp') || !!searchParams.get('new'))
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const SCORING_DEFAULTS = {
    pts_win: 3, pts_exact_both: 3, pts_exact_one: 1,
    pts_diff_correct: 1, pts_diff_wrong: -1,
    mult_r16: 2, mult_qf: 3, mult_sf: 4, mult_final: 6,
    pts_position_exact: 10, pts_semifinalist: 10, pts_finalist: 20, pts_champion_bonus: 30,
    pts_win_pen: 2, pts_draw: 1,
    mult_group_1st: 3, mult_group_2nd: 2, mult_group_3rd: 1,
    mult_world_1st: 7, mult_world_2nd: 6, mult_world_3rd: 5, mult_world_4th: 4,
  }
  const [createForm, setCreateForm] = useState({
    name: '',
    prize: '',
    competition_id: '00000000-0000-0000-0000-000000000001',
    mode: '',
    is_public: false,
    requires_approval: false,
    scoring: { ...SCORING_DEFAULTS },
  })
  const [scoringOpenSections, setScoringOpenSections] = useState({})
  const [creating, setCreating] = useState(false)
  const [competitions, setCompetitions] = useState([])
  const [error, setError] = useState(null)
  const [joinMsg, setJoinMsg] = useState(null)

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: myData }, { data: pubData }, { data: comps }] = await Promise.all([
        supabase.from('tournament_players')
          .select(`
            role, 
            tournaments(
              id, name, mode, invite_code, competition_id, prize, is_featured,
              competitions(name, type),
              creator:users!tournaments_created_by_fkey(display_name),
              participants:tournament_players(count)
            )
          `)
          .eq('user_id', user.id).eq('status', 'approved'),
        supabase.from('tournaments')
          .select(`
            id, name, mode, invite_code, competition_id, is_public, prize, is_featured,
            competitions(name, type),
            creator:users!tournaments_created_by_fkey(display_name),
            participants:tournament_players(count)
          `)
          .eq('is_public', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false }).limit(30),
        supabase.from('competitions').select('id, name, type, status').order('name'),
      ])
      setMyTournaments(myData?.map(tp => ({ 
        ...tp.tournaments, 
        role: tp.role,
        creator_name: tp.tournaments.creator?.display_name,
        participants_count: tp.tournaments.participants?.[0]?.count ?? 0
      })) ?? [])
      setPublicTournaments(pubData?.map(tr => ({
        ...tr,
        creator_name: tr.creator?.display_name,
        participants_count: tr.participants?.[0]?.count ?? 0
      })).sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      }) ?? [])
      setCompetitions(comps ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const selectedComp = competitions.find(c => c.id === createForm.competition_id)
    const isWorldCup = selectedComp?.type === 'world_cup'
    const effectiveMode = isWorldCup ? createForm.mode : 'partidos'
    if (!createForm.name.trim() || !createForm.competition_id || !effectiveMode) return
    setCreating(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tournaments')
        .insert({
          name: createForm.name.trim(),
          prize: createForm.prize.trim() || null,
          competition_id: createForm.competition_id,
          created_by: user.id,
          mode: effectiveMode,
          is_public: createForm.is_public,
          requires_approval: createForm.requires_approval
        })
        .select('id').single()
      if (err) throw err
      // Override tournament_config with custom scoring if changed from defaults
      const scoringPayload = { ...createForm.scoring }
      const hasCustomScoring = Object.keys(scoringPayload).some(k => scoringPayload[k] !== SCORING_DEFAULTS[k])
      if (hasCustomScoring) {
        await supabase.from('tournament_config').update(scoringPayload).eq('tournament_id', data.id)
      }
      setShowCreate(false)
      setCreateForm({ name: '', prize: '', competition_id: '', mode: '', is_public: false, requires_approval: false, scoring: { ...SCORING_DEFAULTS } })
      await loadData()
      navigate(`/torneo/${data.id}`)
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
    setJoinMsg(null)
    try {
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments').select('id, name, requires_approval')
        .eq('invite_code', joinCode.trim().toUpperCase()).single()
      if (tErr || !tournament) throw new Error(t('tournaments.invalid_code'))

      // Check if already a member
      const { data: existing } = await supabase
        .from('tournament_players')
        .select('status').eq('tournament_id', tournament.id).eq('user_id', user.id).single()

      if (existing) {
        if (existing.status === 'approved') {
          navigate(`/torneo/${tournament.id}`)
          return
        }
        setJoinMsg(t('tournaments.already_requested'))
        setJoinCode('')
        return
      }

      const { error: pErr } = await supabase.from('tournament_players')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          role: 'player',
          status: tournament.requires_approval ? 'pending' : 'approved'
        })
      if (pErr) throw pErr
      setJoinMsg(tournament.requires_approval
        ? t('tournaments.join_requested', { name: tournament.name })
        : t('tournaments.joined_success', { name: tournament.name })
      )
      if (!tournament.requires_approval) {
        setTimeout(() => navigate(`/torneo/${tournament.id}`), 1500)
      }
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
            {showCreate ? '✕' : `+ ${t('tournaments.create')}`}
          </button>
        </div>

        {error && (
          <div className="card card-sm" style={{ background: 'var(--error-subtle, #fee2e2)',
              color: 'var(--error, #dc2626)', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
            {error}
          </div>
        )}
        {joinMsg && (
          <div className="card card-sm" style={{ background: 'var(--primary-subtle)',
              color: 'var(--primary)', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
            {joinMsg}
          </div>
        )}

        {showCreate && (
          <div className="card card-sm animate-slide-up" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('tournaments.create')}</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input" placeholder={t('tournaments.name_placeholder')}
                value={createForm.name} required
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input" placeholder={t('tournaments.prize_placeholder')}
                value={createForm.prize} maxLength={100}
                onChange={e => setCreateForm(f => ({ ...f, prize: e.target.value }))}
                style={{ fontSize: '0.9rem' }} />
              {/* Competition selection removed — Always World Cup 2026 */}

              {/* Mode selector — only for World Cup */}
              {createForm.competition_id && competitions.find(c => c.id === createForm.competition_id)?.type === 'world_cup' && (
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 600 }}>
                    {t('tournaments.select_mode')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                    {['posiciones', 'partidos'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, mode: m }))}
                        style={{
                          padding: '0.875rem 0.75rem',
                          borderRadius: 'var(--r-md)',
                          border: createForm.mode === m
                            ? '2px solid var(--primary)'
                            : '2px solid var(--border)',
                          background: createForm.mode === m
                            ? 'var(--primary-subtle)'
                            : 'var(--surface-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        <p style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: createForm.mode === m ? 'var(--primary)' : 'var(--text)',
                          marginBottom: '0.25rem'
                        }}>
                          {m === 'posiciones' ? '🏆' : '⚽'} {t(`modes.${m}`)}
                        </p>
                        <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {t(`modes.${m}_desc`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Visibility and Approval selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                {/* Visibility selector */}
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 600 }}>
                    {t('tournaments.visibility')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                    {[false, true].map(v => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, is_public: v }))}
                        style={{
                          padding: '0.875rem 0.75rem',
                          borderRadius: 'var(--r-md)',
                          border: createForm.is_public === v
                            ? '2px solid var(--primary)'
                            : '2px solid var(--border)',
                          background: createForm.is_public === v
                            ? 'var(--primary-subtle)'
                            : 'var(--surface-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        <p style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: createForm.is_public === v ? 'var(--primary)' : 'var(--text)',
                          marginBottom: '0.25rem'
                        }}>
                          {v ? '🌐' : '🔒'} {t(v ? 'tournaments.public' : 'tournaments.private')}
                        </p>
                        <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {t(v ? 'tournaments.public_desc' : 'tournaments.private_desc')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Approval selector */}
                <div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 600 }}>
                    {t('tournaments.join_method')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                    {[false, true].map(v => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, requires_approval: v }))}
                        style={{
                          padding: '0.875rem 0.75rem',
                          borderRadius: 'var(--r-md)',
                          border: createForm.requires_approval === v
                            ? '2px solid var(--primary)'
                            : '2px solid var(--border)',
                          background: createForm.requires_approval === v
                            ? 'var(--primary-subtle)'
                            : 'var(--surface-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          outline: 'none'
                        }}
                      >
                        <p style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: createForm.requires_approval === v ? 'var(--primary)' : 'var(--text)',
                          marginBottom: '0.25rem'
                        }}>
                          {v ? '✋' : '✅'} {t(v ? 'tournaments.approval_required' : 'tournaments.auto_join')}
                        </p>
                        <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {t(v ? 'tournaments.approval_required_desc' : 'tournaments.auto_join_desc')}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scoring section — unified using ConfigTab component */}
              {(createForm.mode || (createForm.competition_id && competitions.find(c => c.id === createForm.competition_id)?.type !== 'world_cup')) && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    ⚙️ {t('config.tab_config')}
                  </p>
                  <ConfigTab 
                    isAdmin={true} 
                    mode={createForm.mode || 'partidos'} 
                    externalConfig={createForm.scoring}
                    onExternalChange={(key, val) => setCreateForm(f => ({
                      ...f,
                      scoring: { ...f.scoring, [key]: val }
                    }))}
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={creating || (
                  createForm.competition_id &&
                  competitions.find(c => c.id === createForm.competition_id)?.type === 'world_cup' &&
                  !createForm.mode
                )}
              >
                {creating ? t('common.loading') : t('tournaments.create')}
              </button>
            </form>
          </div>
        )}

        <div className="card card-sm" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {t('tournaments.enter_code_label')}
          </p>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" placeholder={t('tournaments.enter_code')}
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8} style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.1em' }} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={joining || !joinCode}>
              {joining ? '…' : t('tournaments.join_btn')}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['mine', 'public'].map(k => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(k)}>
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
              {myTournaments.map(tr => (
                <TournamentCard
                  key={tr.id}
                  tournament={tr}
                  onDeleteSuccess={() => loadData()}
                />
              ))}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {publicTournaments.length === 0
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>—</p>
              : publicTournaments.map(tr => (
                  <TournamentCard
                    key={tr.id}
                    tournament={tr}
                    onDeleteSuccess={() => loadData()}
                  />
                ))
            }
          </div>
        )}
      </div>
    </AppShell>
  )
}


