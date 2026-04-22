import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import { simulateWorldCupBracket } from '../utils/simulatorWC2026'

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
  const [bracketOffset, setBracketOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  const simulatedBracket = useMemo(() => {
    if (!competition?.name?.toLowerCase().includes('world cup')) return {}
    // We send matches as both matches and preds format
    const predsFormat = {}
    matches.forEach(m => {
      predsFormat[m.id] = { home_goals: m.home_goals !== null ? m.home_goals : '', away_goals: m.away_goals !== null ? m.away_goals : '' }
    })
    return simulateWorldCupBracket(matches, predsFormat)
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
    <AppShell saveIndicator={saveStatus}>
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
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
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
                <AdminMatchCard stacked={true} key={m.id} match={STAGE_ORDER.indexOf(stage) > 0 ? { ...m, home_team: simulatedBracket[m.round]?.home_team || m.home_team, away_team: simulatedBracket[m.round]?.away_team || m.away_team } : m} onChange={updateMatch} t={t} />
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
          const bracketStages = isMobile 
            ? playoffStages.filter(s => s !== 'third_place')
            : playoffStages.filter(s => s !== 'group')
          const visibleCount = isMobile ? 1 : bracketStages.length
          const safeOffset = Math.min(bracketOffset, Math.max(0, bracketStages.length - visibleCount))
          const visibleStages = bracketStages.slice(safeOffset, safeOffset + visibleCount)
          
          return (
            <div style={{ paddingBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <button 
                  className="btn btn-icon" 
                  onClick={() => setBracketOffset(v => Math.max(0, v - 1))} 
                  disabled={safeOffset === 0}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem' }}
                >
                  &lt;
                </button>
                
                <div style={{ display: 'flex', gap: '2.5rem', flex: 1, justifyContent: 'center', minWidth: 0 }}>
                  {visibleStages.map(stage => (
                    <h3 key={stage} style={{ width: isMobile ? 'auto' : '320px', flex: isMobile ? 1 : 'none', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text)', margin: 0, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t(`predictions.stages.${stage}`)}
                    </h3>
                  ))}
                </div>

                <button 
                  className="btn btn-icon" 
                  onClick={() => setBracketOffset(v => Math.min(bracketStages.length - visibleCount, v + 1))} 
                  disabled={safeOffset >= bracketStages.length - visibleCount || bracketStages.length <= visibleCount}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem' }}
                >
                  &gt;
                </button>
              </div>

              <div className={`playoff-bracket ${isMobile ? 'is-mobile' : ''}`} style={{ justifyContent: 'center', marginBottom: byStage['third_place']?.length > 0 ? '6rem' : 0 }}>
                {visibleStages.map((stage, index) => {
                  const isLastColumn = index === visibleStages.length - 1
                  return (
                  <div key={stage} className={`bracket-column ${index === 0 && bracketOffset > 0 ? 'is-shifted-first' : ''}`}>
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      position: 'relative',
                      minHeight: undefined
                    }}>
                      {byStage[stage].map((match, matchIndex) => (
                        <div key={match.id} className="bracket-match-cell">
                          <AdminMatchCard stacked={true} match={{ ...match, home_team: simulatedBracket[match.round]?.home_team || match.home_team, away_team: simulatedBracket[match.round]?.away_team || match.away_team }} onChange={updateMatch} t={t} />
                          
                          {isLastColumn && stage !== 'final' && (
                            <>
                              {matchIndex % 2 === 0 && (
                                <div style={{
                                  position: 'absolute',
                                  right: '-1.25rem',
                                  top: '50%',
                                  width: '1.25rem',
                                  height: '50%',
                                  borderTop: '2px solid var(--border-strong)',
                                  borderRight: '2px solid var(--border-strong)',
                                  borderTopRightRadius: '6px',
                                  pointerEvents: 'none',
                                  zIndex: 0
                                }} />
                              )}
                              {matchIndex % 2 === 1 && (
                                <>
                                  <div style={{
                                    position: 'absolute',
                                    right: '-1.25rem',
                                    bottom: '50%',
                                    width: '1.25rem',
                                    height: '50%',
                                    borderBottom: '2px solid var(--border-strong)',
                                    borderRight: '2px solid var(--border-strong)',
                                    borderBottomRightRadius: '6px',
                                    pointerEvents: 'none',
                                    zIndex: 0
                                  }} />
                                  <div style={{
                                    position: 'absolute',
                                    right: '-2.5rem',
                                    top: '-1px',
                                    width: '1.25rem',
                                    borderTop: '2px solid var(--border-strong)',
                                    pointerEvents: 'none',
                                    zIndex: 0
                                  }} />
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      
                      {isMobile && stage === 'final' && byStage['third_place'] && byStage['third_place'].length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(50% + 85px)',
                          left: 0,
                          right: 0,
                          zIndex: 10
                        }}>
                          <h3 style={{ fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
                            {t('predictions.stages.third_place')}
                          </h3>
                          {byStage['third_place'].map(match => (
                            <AdminMatchCard stacked={true} key={match.id} match={{ ...match, home_team: simulatedBracket[match.round]?.home_team || match.home_team, away_team: simulatedBracket[match.round]?.away_team || match.away_team }} onChange={updateMatch} t={t} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )
        })()}
      </div>
    </AppShell>
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
