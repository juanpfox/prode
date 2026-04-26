import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import { simulateWorldCupBracket } from '../utils/simulatorWC2026'
import { simulateChampionsLeagueBracket, areSFsResolved } from '../utils/simulatorUCL'

// ─── WC2026 bracket tree constants ───────────────────────────────────────────
const WC2026_CHILDREN = {
  89:[73,75], 90:[74,77], 91:[76,78], 92:[79,80],
  93:[81,84], 94:[82,86], 95:[85,88], 96:[83,87],
  97:[89,90], 98:[91,92], 99:[93,94], 100:[95,96],
  101:[97,98], 102:[99,100], 104:[101,102],
}
const BRACKET_STAGE_ROUNDS = {
  r32:[73,75,74,77,76,78,79,80,81,84,82,86,85,88,83,87],
  r16:[89,90,91,92,93,94,95,96],
  qf:[97,98,99,100],
  sf:[101,102],
  final:[104, 103],
}
const CONN_W = 18
const CARD_GAP = 18
const ANIM = '0.35s cubic-bezier(0.4, 0, 0.2, 1)'

const FIFA_TO_ISO2 = {
  ARG: 'ar', BRA: 'br', FRA: 'fr', GER: 'de', ITA: 'it', ESP: 'es', POR: 'pt', NED: 'nl',
  ENG: 'gb', SCO: 'gb', WAL: 'gb', NIR: 'gb', USA: 'us', MEX: 'mx', CAN: 'ca',
  JPN: 'jp', KOR: 'kr', AUS: 'au', KSA: 'sa', QAT: 'qa', CRO: 'hr', SRB: 'rs',
  SUI: 'ch', BEL: 'be', DEN: 'dk', POL: 'pl', URU: 'uy', COL: 'co', CHI: 'cl',
  PER: 'pe', ECU: 'ec', MAR: 'ma', SEN: 'sn', GHA: 'gh', CMR: 'cm', NGA: 'ng',
  RSA: 'za', BIH: 'ba', CZE: 'cz', GRE: 'gr', TUR: 'tr', EGY: 'eg', TUN: 'tn',
  CRC: 'cr', PAN: 'pa', JAM: 'jm', HON: 'hn', PAR: 'py', BFA: 'bf', MLI: 'ml',
  HAI: 'ht', SWE: 'se', CPV: 'cv', COD: 'cd',
}

function TeamFlag({ code, size = 18 }) {
  if (!code) return null
  const iso2 = FIFA_TO_ISO2[code] || code.slice(0, 2).toLowerCase()
  return (
    <img 
      src={`https://flagcdn.com/w40/${iso2}.png`} 
      alt={code} 
      style={{ 
        width: `${size}px`, 
        height: 'auto', 
        borderRadius: '2px', 
        display: 'inline-block',
        verticalAlign: 'middle',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final']

export default function AdminResultsEntryPage() {
  const { t } = useTranslation()
  const { competitionId } = useParams()
  const navigate = useNavigate()

  const [competition, setCompetition] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('groups')
  const [activeGroup, setActiveGroup] = useState('A')
  const [saveStatus, setSaveStatus] = useState(null)
  const [recalcStatus, setRecalcStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [syncResult, setSyncResult] = useState(null)
  const [bracketOffset, setBracketOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const swipeTouchStart = useRef(null)
  const bracketContainerRef = useRef(null)
  const prevBracketOffset = useRef(0)

  const { simulatedBracket, sfResolved } = useMemo(() => {
    if (!competition) return { simulatedBracket: {}, sfResolved: false }
    // We send matches as both matches and preds format
    const predsFormat = {}
    matches.forEach(m => {
      predsFormat[m.id] = { home_goals: m.home_goals !== null ? m.home_goals : '', away_goals: m.away_goals !== null ? m.away_goals : '', pen_pick: m.pen_winner ?? null }
    })
    if (competition.name?.toLowerCase().includes('world cup')) {
      return { simulatedBracket: simulateWorldCupBracket(matches, predsFormat), sfResolved: true }
    }
    if (competition.type === 'champions_league') {
      const resolved = areSFsResolved(matches, predsFormat)
      return { simulatedBracket: simulateChampionsLeagueBracket(matches, predsFormat), sfResolved: resolved }
    }
    return { simulatedBracket: {}, sfResolved: false }
  }, [matches, competition])

  const pendingChanges = useRef({})
  const timeoutRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (!mobile) setBracketOffset(prev => Math.max(0, prev - 1))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll when bracket offset changes
  useEffect(() => {
    if (!bracketContainerRef.current || bracketOffset === prevBracketOffset.current) {
      prevBracketOffset.current = bracketOffset
      return
    }
    prevBracketOffset.current = bracketOffset
    requestAnimationFrame(() => {
      setTimeout(() => {
        const container = bracketContainerRef.current
        if (!container) return
        const cards = container.querySelectorAll(`[data-stage-idx="${bracketOffset}"] [data-round]`)
        if (!cards.length) return
        cards[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
    })
  }, [bracketOffset])

  useEffect(() => { loadData() }, [competitionId])
  useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) } }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: comp } = await supabase.from('competitions').select('*').eq('id', competitionId).single()
      setCompetition(comp)

      const { data: ms } = await supabase
        .from('matches')
        .select('*, home_team:teams!home_team_id(name, code, group_name, initial_position), away_team:teams!away_team_id(name, code, group_name, initial_position)')
        .eq('competition_id', competitionId)
        .order('kickoff_at')
      setMatches(ms ?? [])
      
      const firstGroupMatch = ms?.find(m => m.stage === 'group' && m.home_team?.group_name)
      if (firstGroupMatch) setActiveGroup(firstGroupMatch.home_team.group_name)
    } finally {
      setLoading(false)
    }
  }

  function updateMatch(matchId, field, value) {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m
      
      let next = { ...m, [field]: value }

      // Auto-set other goals to 0 if only one side filled
      if (field === 'home_goals' && (next.away_goals === null || next.away_goals === undefined || next.away_goals === '')) {
        next.away_goals = 0
      } else if (field === 'away_goals' && (next.home_goals === null || next.home_goals === undefined || next.home_goals === '')) {
        next.home_goals = 0
      }
      
      // Auto-calculate winner
      if (field === 'home_goals' || field === 'away_goals' || field === 'went_to_pens' || field === 'pen_winner') {
        const hg = next.home_goals !== null && next.home_goals !== '' ? parseInt(next.home_goals) : null
        const ag = next.away_goals !== null && next.away_goals !== '' ? parseInt(next.away_goals) : null
        
        if (hg !== null && ag !== null) {
          if (hg > ag) next.winner = 'home'
          else if (hg < ag) next.winner = 'away'
          else next.winner = 'draw'
          
          const isElim = STAGE_ORDER.indexOf(next.stage) > 0
          if (isElim && hg === ag) {
            // keep went_to_pens and pen_winner as is
          } else {
            next.went_to_pens = false
            next.pen_winner = null
          }
        } else {
          next.winner = null
        }
      }
      
      pendingChanges.current[matchId] = {
        home_goals: next.home_goals !== null && next.home_goals !== '' ? parseInt(next.home_goals) : null,
        away_goals: next.away_goals !== null && next.away_goals !== '' ? parseInt(next.away_goals) : null,
        winner: next.winner,
        went_to_pens: next.went_to_pens,
        pen_winner: next.pen_winner
      }
      
      return next
    }))

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(() => saveChanges(), 2000)
  }

  async function saveChanges() {
    const changes = { ...pendingChanges.current }
    if (Object.keys(changes).length === 0) return
    pendingChanges.current = {}

    try {
      for (const [id, payload] of Object.entries(changes)) {
        await supabase.from('matches').update(payload).eq('id', id)
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? null : prev), 3000)
    } catch (e) {
      console.error(e)
      setSaveStatus('error')
    }
  }

  const byStage = {}
  matches.forEach(m => {
    if (!byStage[m.stage]) byStage[m.stage] = []
    byStage[m.stage].push(m)
  })

  const groupLetters = Array.from(new Set(matches.filter(m => m.stage === 'group').map(m => m.home_team?.group_name))).filter(Boolean).sort()
  const groupMatches = matches.filter(m => m.stage === 'group')
  const playoffStages = STAGE_ORDER.filter(s => s !== 'group' && byStage[s]?.length)



  const handleSyncFromApi = async () => {
    setSyncStatus('loading')
    setSyncResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-ucl-results')
      if (error) throw error
      setSyncResult(data)
      setSyncStatus('done')
      if (data?.db_updated > 0) await loadData()
      setTimeout(() => setSyncStatus('idle'), 6000)
    } catch (e) {
      console.error(e)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 4000)
    }
  }

  const handleRecalculate = async () => {
    setRecalcStatus('loading')
    try {
      const { error } = await supabase.rpc('recalculate_all_scores_for_competition', {
        p_competition_id: competitionId
      })
      if (error) throw error
      setRecalcStatus('done')
      setTimeout(() => setRecalcStatus('idle'), 3000)
    } catch (e) {
      console.error(e)
      setRecalcStatus('error')
      setTimeout(() => setRecalcStatus('idle'), 3000)
    }
  }

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  return (
    <AppShell saveIndicator={saveStatus} wide={view === 'playoffs'}>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/resultados')}>
              ← {t('common.back')}
            </button>
            <div>
              <h2 className="home-section-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                {competition?.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.1rem' }}>Admin: Carga de Resultados</p>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {competition?.type === 'champions_league' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleSyncFromApi}
                    disabled={syncStatus === 'loading'}
                    title="Importar resultados reales desde football-data.org"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', opacity: syncStatus === 'loading' ? 0.6 : 1, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                  >
                    {syncStatus === 'loading' ? '⏳' : syncStatus === 'done' ? '✅' : syncStatus === 'error' ? '❌' : '🌐'} Sync API
                  </button>
                  {syncStatus === 'done' && syncResult && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {syncResult.db_updated > 0
                        ? `+${syncResult.db_updated} partido${syncResult.db_updated !== 1 ? 's' : ''} actualizado${syncResult.db_updated !== 1 ? 's' : ''}`
                        : 'Sin cambios nuevos'}
                    </span>
                  )}
                  {syncStatus === 'error' && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--error, red)' }}>Error al conectar con la API</span>
                  )}
                </div>
              )}
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleRecalculate}
                disabled={recalcStatus === 'loading'}
                title="Recalcular puntos de todos los torneos de esta competición"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', opacity: recalcStatus === 'loading' ? 0.6 : 1 }}
              >
                {recalcStatus === 'loading' ? '⏳' : recalcStatus === 'done' ? '✅' : recalcStatus === 'error' ? '❌' : '🔄'} Recalcular pts
              </button>
              <button className={`btn btn-sm ${view === 'groups' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('groups')} style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                {t('predictions.views.groups')}
              </button>
              <button className={`btn btn-sm ${view === 'playoffs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('playoffs')} style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                {t('predictions.views.playoffs')}
              </button>
              <button className={`btn btn-sm ${view === 'dates' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('dates')} style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                {t('predictions.views.dates')}
              </button>
            </div>
          </div>
        </div>

        {view === 'groups' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            {groupLetters.map(l => (
              <button key={l} onClick={() => setActiveGroup(l)} 
                className={`btn btn-sm ${activeGroup === l ? 'btn-primary' : 'btn-ghost'}`} 
                style={{ width: '2.2rem', height: '2.2rem', padding: 0 }}>{l}</button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setView('playoffs')} 
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>PlayOffs →</button>
          </div>
        )}

        {/* --- VIEW: DATES --- */}
        {view === 'dates' && STAGE_ORDER.filter(s => byStage[s]?.length).map(stage => (
          <section key={stage} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {t(`predictions.stages.${stage}`)}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {byStage[stage].map(m => (
                <AdminMatchCard stacked={true} key={m.id} match={STAGE_ORDER.indexOf(stage) > 0 ? (() => {
                    const simHome = simulatedBracket[m.id]?.home_team || simulatedBracket[m.round]?.home_team
                    const simAway = simulatedBracket[m.id]?.away_team || simulatedBracket[m.round]?.away_team
                    // For UCL final: only use DB team as fallback when SFs are resolved
                    const useDbFallback = competition?.type !== 'champions_league' || sfResolved || m.stage !== 'final'
                    return {
                      ...m,
                      home_team: simHome || (useDbFallback ? m.home_team : null),
                      away_team: simAway || (useDbFallback ? m.away_team : null),
                    }
                  })() : m} onChange={updateMatch} t={t} />
              ))}
            </div>
          </section>
        ))}

        {/* --- VIEW: GROUPS --- */}
        {view === 'groups' && (
          <div className="predictions-layout-grid">
            <div className="matches-column">
              <h3 style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                {t('posiciones.group')} {activeGroup}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {groupMatches.filter(m => m.home_team?.group_name === activeGroup).map(m => (
                  <AdminMatchCard key={m.id} match={m} onChange={updateMatch} t={t} />
                ))}
              </div>
            </div>
            <div className="table-column">
              <GroupTable 
                rows={calculateGroupTable(groupMatches.filter(m => m.home_team?.group_name === activeGroup))}
                t={t}
              />
            </div>
          </div>
        )}

        {/* --- VIEW: PLAYOFFS --- */}
        {view === 'playoffs' && (() => {
          const bracketStages = playoffStages.filter(s => s !== 'third_place' && s !== 'group')

          if (bracketStages.length === 0) {
            return (
              <div className="card card-sm" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}>🏆</span>
                <p style={{ margin: 0 }}>No hay partidos de playoff</p>
              </div>
            )
          }

          const visibleCount = isMobile ? 2 : (window.innerWidth < 1400 ? 3 : bracketStages.length)
          const safeOffset = Math.min(bracketOffset, Math.max(0, bracketStages.length - visibleCount))
          const colPct = 100 / visibleCount
          const translatePct = -(safeOffset * colPct)

          const handleTouchStart = (e) => { swipeTouchStart.current = e.touches[0].clientX }
          const handleTouchEnd = (e) => {
            if (swipeTouchStart.current === null) return
            const delta = swipeTouchStart.current - e.changedTouches[0].clientX
            if (delta > 50) setBracketOffset(v => Math.min(v + 1, Math.max(0, bracketStages.length - visibleCount)))
            else if (delta < -50) setBracketOffset(v => Math.max(0, v - 1))
            swipeTouchStart.current = null
          }

          return (
            <div style={{ paddingBottom: '2rem' }}>
              {/* Stage titles */}
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-md)', marginBottom: '1rem', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {safeOffset > 0 && (
                  <button
                    onClick={() => setBracketOffset(v => Math.max(0, v - 1))}
                    style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '3.5rem',
                      background: 'linear-gradient(to right, var(--surface-2) 60%, transparent)',
                      border: 'none', color: 'var(--primary)', cursor: 'pointer', zIndex: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900
                    }}
                  >
                    ‹
                  </button>
                )}
                {safeOffset < (bracketStages.length - visibleCount) && (
                  <button
                    onClick={() => setBracketOffset(v => Math.min(v + 1, bracketStages.length - visibleCount))}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: '3.5rem',
                      background: 'linear-gradient(to left, var(--surface-2) 60%, transparent)',
                      border: 'none', color: 'var(--primary)', cursor: 'pointer', zIndex: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900
                    }}
                  >
                    ›
                  </button>
                )}
                <div style={{
                  display: 'flex',
                  transform: `translateX(${translatePct}%)`,
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'transform',
                }}>
                  {bracketStages.map(stage => (
                    <h3 key={stage} style={{
                      flex: `0 0 ${colPct}%`,
                      width: `${colPct}%`,
                      fontWeight: 800, fontSize: '0.8rem',
                      textTransform: 'uppercase', color: 'var(--text)',
                      margin: 0, padding: '0.75rem 1rem',
                      textAlign: 'center', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {stage === 'final' && !isMobile
                        ? `${t('predictions.stages.final')} & ${t('predictions.stages.third_place')}`
                        : t(`predictions.stages.${stage}`)}
                    </h3>
                  ))}
                </div>
              </div>

              {/* Bracket */}
              <div ref={bracketContainerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <AdminBracketTree
                  byStage={byStage}
                  bracketStages={bracketStages}
                  simulatedBracket={simulatedBracket}
                  sfResolved={sfResolved}
                  competition={competition}
                  updateMatch={updateMatch}
                  t={t}
                  colPct={colPct}
                  translatePct={translatePct}
                  offset={safeOffset}
                  visibleCount={visibleCount}
                />
              </div>

              {/* Dots indicator */}
              {bracketStages.length > visibleCount && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
                  {bracketStages.slice(0, bracketStages.length - visibleCount + 1).map((_, i) => (
                    <button key={i} onClick={() => setBracketOffset(i)} style={{
                      width: i === safeOffset ? '20px' : '8px', height: '8px',
                      borderRadius: '9999px', border: 'none', cursor: 'pointer',
                      background: i === safeOffset ? 'var(--primary)' : 'var(--border-strong)',
                      transition: 'all 0.2s ease', padding: 0,
                    }} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </AppShell>
  )
}

// ─── AdminBracketTree — same layout as BracketTree in PredictionsPage ────────
function AdminBracketTree({ byStage, bracketStages, simulatedBracket, sfResolved, competition, updateMatch, t, colPct, translatePct, offset, visibleCount }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const cardRef = useRef(null)
  const [cardH, setCardH] = useState(null)

  useEffect(() => {
    if (!cardRef.current) return
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height
      if (h && h > 0) setCardH(h)
    })
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [])

  const matchByRound = {}
  Object.values(byStage).flat().forEach(m => { if (m.round) matchByRound[m.round] = m })

  const allStageRounds = useMemo(() => bracketStages.map(s => BRACKET_STAGE_ROUNDS[s] || []), [bracketStages])

  const roundY = useMemo(() => {
    if (!cardH) return {}
    const pos = {}

    // Phase 1: anchor column (compact stack)
    const anchorRounds = allStageRounds[offset] || []
    anchorRounds.forEach((r, i) => { pos[r] = i * (cardH + CARD_GAP) })

    // Phase 2: go RIGHT — each card centres on its children
    for (let si = offset + 1; si < bracketStages.length; si++) {
      const rounds = allStageRounds[si] || []
      rounds.forEach((r, idx) => {
        const children = WC2026_CHILDREN[r] || []
        const childCentres = children
          .map(c => pos[c] != null ? pos[c] + cardH / 2 : null)
          .filter(y => y !== null)
        if (childCentres.length === 2) {
          pos[r] = (childCentres[0] + childCentres[1]) / 2 - cardH / 2
        } else if (childCentres.length === 1) {
          pos[r] = childCentres[0] - cardH / 2
        } else {
          if (r === 103 && pos[104] != null) {
            pos[r] = pos[104] + cardH + CARD_GAP * 2
          } else {
            pos[r] = idx * (cardH + CARD_GAP)
          }
        }
      })
    }

    // Phase 3: go LEFT — position based on parent expectations
    for (let si = offset - 1; si >= 0; si--) {
      const rounds = allStageRounds[si] || []
      const nextRounds = allStageRounds[si + 1] || []
      const c2p = {}
      nextRounds.forEach(pr => (WC2026_CHILDREN[pr] || []).forEach(c => { c2p[c] = pr }))
      const parentChildren = {}
      rounds.forEach(r => {
        const pr = c2p[r]
        if (pr != null) {
          if (!parentChildren[pr]) parentChildren[pr] = []
          parentChildren[pr].push(r)
        }
      })
      Object.entries(parentChildren).forEach(([pr, kids]) => {
        const parentY = pos[parseInt(pr)]
        if (parentY == null) return
        const parentCentre = parentY + cardH / 2
        if (kids.length === 2) {
          const spacing = cardH + CARD_GAP
          pos[kids[0]] = parentCentre - spacing / 2 - cardH / 2
          pos[kids[1]] = parentCentre + spacing / 2 - cardH / 2
        } else if (kids.length === 1) {
          pos[kids[0]] = parentCentre - cardH / 2
        }
      })
      rounds.forEach((r, idx) => { if (pos[r] == null) pos[r] = idx * (cardH + CARD_GAP) })
    }

    return pos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardH, offset, bracketStages.join(',')])

  const totalH = useMemo(() => {
    if (!cardH) return 0
    const visibleRounds = allStageRounds.slice(offset, offset + visibleCount).flat()
    const visibleY = visibleRounds.map(r => roundY[r]).filter(y => y != null)
    if (!visibleY.length) return 0
    return Math.max(...visibleY) + cardH
  }, [roundY, cardH, offset, visibleCount, allStageRounds])

  const renderCard = (round) => {
    const match = matchByRound[round]
    if (!match) return <div style={{ minHeight: 80, opacity: 0.4 }} />
    const isUCLFinal = competition?.type === 'champions_league' && match.stage === 'final'
    const simHome = simulatedBracket[round]?.home_team
    const simAway = simulatedBracket[round]?.away_team
    const enriched = {
      ...match,
      home_team: simHome || (!isUCLFinal || sfResolved ? match.home_team : null),
      away_team: simAway || (!isUCLFinal || sfResolved ? match.away_team : null),
    }
    return (
      <AdminMatchCard stacked={true} match={enriched} onChange={updateMatch} t={t} />
    )
  }

  // Probe card for height measurement
  const probeRound = (allStageRounds[0] || [])[0]
  const probeMatch = probeRound ? matchByRound[probeRound] : null

  const trn = `top ${ANIM}, height ${ANIM}`

  return (
    <div style={{ overflowX: 'clip', overflowY: 'visible' }}>
      {probeMatch && (
        <div ref={cardRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: `${colPct}%` }}>
          <AdminMatchCard stacked={true} match={probeMatch} onChange={() => {}} t={t} />
        </div>
      )}

      {cardH && totalH > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'nowrap',
          transform: `translateX(${translatePct}%)`,
          transition: `transform ${ANIM}`,
          willChange: 'transform',
          padding: '0.75rem 0',
        }}>
          {bracketStages.map((stage, si) => {
            const rounds = allStageRounds[si] || []
            const isLast = si === bracketStages.length - 1
            const nextRounds = !isLast ? (allStageRounds[si + 1] || []) : []

            return (
              <div key={stage} data-stage-idx={si} style={{
                flex: `0 0 ${colPct}%`,
                width: `${colPct}%`,
                boxSizing: 'border-box',
                paddingRight: isLast ? 0 : CONN_W,
                position: 'relative',
                height: totalH,
                overflow: 'visible',
                transition: `height ${ANIM}`,
              }}>
                {rounds.map(round => {
                  const y = roundY[round] ?? 0
                  return (
                    <div key={round} data-round={round} style={{
                      position: 'absolute',
                      top: y,
                      left: 0,
                      right: isLast ? 0 : CONN_W,
                      height: cardH,
                      transition: trn,
                    }}>
                      {renderCard(round)}
                    </div>
                  )
                })}

                {/* Bracket connectors */}
                {!isLast && nextRounds.map(parentRound => {
                  const children = WC2026_CHILDREN[parentRound] || []
                  const childrenInCol = children.filter(c => rounds.includes(c))

                  if (childrenInCol.length === 1) {
                    const cy = roundY[childrenInCol[0]]
                    if (cy == null) return null
                    return (
                      <div key={`conn-${parentRound}`} style={{
                        position: 'absolute',
                        right: 0,
                        top: cy + cardH / 2,
                        width: CONN_W,
                        borderBottom: '2px solid var(--border-strong)',
                        pointerEvents: 'none',
                        transition: trn,
                      }} />
                    )
                  }

                  if (childrenInCol.length !== 2) return null

                  const y0 = roundY[childrenInCol[0]]
                  const y1 = roundY[childrenInCol[1]]
                  if (y0 == null || y1 == null) return null

                  const topCentre = Math.min(y0, y1) + cardH / 2
                  const botCentre = Math.max(y0, y1) + cardH / 2
                  const armH = botCentre - topCentre
                  const midY = (topCentre + botCentre) / 2

                  return (
                    <div key={`conn-${parentRound}`}>
                      <div style={{ position: 'absolute', right: CONN_W / 2, top: topCentre, width: CONN_W / 2, borderBottom: '2px solid var(--border-strong)', pointerEvents: 'none', transition: trn }} />
                      <div style={{ position: 'absolute', right: CONN_W / 2, top: botCentre, width: CONN_W / 2, borderBottom: '2px solid var(--border-strong)', pointerEvents: 'none', transition: trn }} />
                      <div style={{ position: 'absolute', right: CONN_W / 2, top: topCentre, height: armH, borderLeft: '2px solid var(--border-strong)', pointerEvents: 'none', transition: trn }} />
                      <div style={{ position: 'absolute', right: 0, top: midY, width: CONN_W / 2, borderBottom: '2px solid var(--border-strong)', pointerEvents: 'none', transition: trn }} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupTable({ rows, t }) {
  return (
    <div className="card card-sm" style={{ padding: 0 }}>
      <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 800 }}>{t('nav.leaderboard')}</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-3)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.5rem 0.875rem', fontWeight: 700 }}>#</th>
              <th style={{ padding: '0.5rem 0.25rem', fontWeight: 700 }}>{t('predictions.table.team')}</th>
              <th style={{ padding: '0.5rem 0.25rem', textAlign: 'center', fontWeight: 700 }}>{t('predictions.table.pj')}</th>
              <th style={{ padding: '0.5rem 0.25rem', textAlign: 'center', fontWeight: 700 }}>{t('predictions.table.pts')}</th>
              <th style={{ padding: '0.5rem 0.25rem', textAlign: 'center', fontWeight: 700 }}>{t('predictions.table.dif')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.625rem 0.875rem', fontWeight: 800, color: i < 2 ? 'var(--primary)' : 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ padding: '0.625rem 0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TeamFlag code={r.code} size={14} />
                    <span style={{ fontWeight: 600 }}>{t(`teams.${r.code}`, { defaultValue: r.name })}</span>
                  </div>
                </td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'center' }}>{r.pj}</td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'center', fontWeight: 800 }}>{r.pts}</td>
                <td style={{ padding: '0.625rem 0.25rem', textAlign: 'center' }}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function calculateGroupTable(groupMatches) {
  const table = {}
  groupMatches.forEach(m => {
    if (m.home_team && !table[m.home_team_id]) {
      table[m.home_team_id] = { id: m.home_team_id, code: m.home_team.code, name: m.home_team.name, initial_position: m.home_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
    }
    if (m.away_team && !table[m.away_team_id]) {
      table[m.away_team_id] = { id: m.away_team_id, code: m.away_team.code, name: m.away_team.name, initial_position: m.away_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
    }

    if (m.home_goals !== null && m.away_goals !== null) {
      const hg = parseInt(m.home_goals), ag = parseInt(m.away_goals)
      table[m.home_team_id].pj++
      table[m.away_team_id].pj++
      table[m.home_team_id].gf += hg; table[m.home_team_id].gc += ag
      table[m.away_team_id].gf += ag; table[m.away_team_id].gc += hg
      if (hg > ag) { table[m.home_team_id].g++; table[m.home_team_id].pts += 3; table[m.away_team_id].p++ }
      else if (hg < ag) { table[m.away_team_id].g++; table[m.away_team_id].pts += 3; table[m.home_team_id].p++ }
      else { table[m.home_team_id].e++; table[m.home_team_id].pts++; table[m.away_team_id].e++; table[m.away_team_id].pts++ }
    }
  })
  return Object.values(table).map(t => ({ ...t, dg: t.gf - t.gc }))
    .sort((a,b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (a.initial_position - b.initial_position))
}

function AdminMatchCard({ match, onChange, t, stacked }) {
  const home = t(`teams.${match.home_team?.code}`, { defaultValue: match.home_team?.name ?? '?' })
  const away = t(`teams.${match.away_team?.code}`, { defaultValue: match.away_team?.name ?? '?' })
  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    + ' ' + kickoff.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const isElim = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'].includes(match.stage)
  const hg = match.home_goals !== null && match.home_goals !== '' ? parseInt(match.home_goals) : null
  const ag = match.away_goals !== null && match.away_goals !== '' ? parseInt(match.away_goals) : null
  const showPens = isElim && hg !== null && ag !== null && hg === ag

  const hasFilled = hg !== null || ag !== null

  return (
    <div className={`card card-sm ${stacked ? 'match-card-stacked' : ''}`} style={{
      padding: '0.75rem 0.875rem',
      borderColor: hasFilled ? 'var(--primary)' : undefined,
      borderWidth: hasFilled ? '1.5px' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kickoffStr}</span>
          {match.venue && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              • {match.venue}
            </span>
          )}
        </div>
        {hasFilled && (
          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
            ✅ Cargado
          </span>
        )}
      </div>

      <div className="match-card-grid">
        <div className="match-team-col home">
          <span className="match-team-name">{home}</span>
          <TeamFlag code={match.home_team?.code} />
        </div>
        <div className="match-center-col">
          <AdminGoalInput 
            val={match.home_goals ?? ''} 
            onChange={v => onChange(match.id, 'home_goals', v)} 
          />
          <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem' }}>vs</span>
          <AdminGoalInput 
            val={match.away_goals ?? ''} 
            onChange={v => onChange(match.id, 'away_goals', v)} 
          />
        </div>
        <div className="match-team-col away">
          <TeamFlag code={match.away_team?.code} />
          <span className="match-team-name">{away}</span>
        </div>
      </div>

      {showPens && (
        <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={match.went_to_pens || false} onChange={e => onChange(match.id, 'went_to_pens', e.target.checked)} /> Penales?
          </label>
          {match.went_to_pens && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn btn-sm ${match.pen_winner === 'home' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.625rem' }}
                onClick={() => onChange(match.id, 'pen_winner', 'home')}
              >
                {home}
              </button>
              <button 
                className={`btn btn-sm ${match.pen_winner === 'away' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.625rem' }}
                onClick={() => onChange(match.id, 'pen_winner', 'away')}
              >
                {away}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminGoalInput({ val, onChange }) {
  const inputRef = useRef(null)
  const num = val === '' || val === null || val === undefined ? null : parseInt(val)
  const inc = () => onChange(num === null ? 1 : Math.min(20, num + 1))
  const dec = () => {
    if (num === null) onChange(0)
    else if (num > 0) onChange(num - 1)
  }

  const getAllInputs = () => Array.from(document.querySelectorAll('.goal-input-field'))

  const handleKeyDown = (e) => {
    const inputs = getAllInputs()
    const idx = inputs.indexOf(inputRef.current)
    if (idx === -1) return

    let targetIdx = -1

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      targetIdx = idx + 1
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      targetIdx = idx - 1
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      targetIdx = idx + 2
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      targetIdx = idx - 2
    } else {
      return
    }

    if (targetIdx >= 0 && targetIdx < inputs.length) {
      inputs[targetIdx].focus()
      inputs[targetIdx].select()
    }
  }

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') {
      onChange(null)
    } else {
      const n = Math.min(20, parseInt(raw))
      onChange(n)
    }
  }

  return (
    <div className="goal-input-wrapper">
      <button className="goal-input-btn" tabIndex={-1} onClick={dec}>−</button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="goal-input-val goal-input-field"
        value={num !== null ? num : ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.target.select()}
        autoComplete="off"
      />
      <button className="goal-input-btn" tabIndex={-1} onClick={inc}>+</button>
    </div>
  )
}
