import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import PosicionesPredictionsPage from './PosicionesPredictionsPage'
import { simulateWorldCupBracket } from '../utils/simulatorWC2026'
 
const FIFA_TO_ISO2 = {
  ARG: 'ar', BRA: 'br', FRA: 'fr', GER: 'de', ITA: 'it', ESP: 'es', POR: 'pt', NED: 'nl',
  ENG: 'gb', SCO: 'gb', WAL: 'gb', NIR: 'gb', USA: 'us', MEX: 'mx', CAN: 'ca',
  JPN: 'jp', KOR: 'kr', AUS: 'au', KSA: 'sa', QAT: 'qa', CRO: 'hr', SRB: 'rs',
  SUI: 'ch', BEL: 'be', DEN: 'dk', POL: 'pl', URU: 'uy', COL: 'co', CHI: 'cl',
  PER: 'pe', ECU: 'ec', MAR: 'ma', SEN: 'sn', GHA: 'gh', CMR: 'cm', NGA: 'ng',
  RSA: 'za', BIH: 'ba', CZE: 'cz', GRE: 'gr', TUR: 'tr', EGY: 'eg', TUN: 'tn',
  CRC: 'cr', PAN: 'pa', JAM: 'jm', HON: 'hn', PAR: 'py', BFA: 'bf', MLI: 'ml',
  HAI: 'ht', SWE: 'se', CPV: 'cv',
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

// Bracket-aware display order per round number.
// Pairs of consecutive entries feed the same match in the next stage.
// Derived from the LATER_ROUNDS tree in simulatorWC2026.js
const BRACKET_DISPLAY_ORDER = {
  // R32 — pairs: (73,75)→89, (74,77)→90, (76,78)→91, (79,80)→92,
  //              (81,84)→93, (82,86)→94, (85,88)→95, (83,87)→96
  73: 0, 75: 1, 74: 2, 77: 3, 76: 4, 78: 5, 79: 6, 80: 7,
  81: 8, 84: 9, 82: 10, 86: 11, 85: 12, 88: 13, 83: 14, 87: 15,
  // R16 — pairs: (89,90)→97, (91,92)→98, (93,94)→99, (95,96)→100
  89: 0, 90: 1, 91: 2, 92: 3, 93: 4, 94: 5, 95: 6, 96: 7,
  // QF — pairs: (97,98)→101, (99,100)→102
  97: 0, 98: 1, 99: 2, 100: 3,
  // SF
  101: 0, 102: 1,
  // Final
  104: 0,
}
export default function PredictionsPage() {
  const { t, i18n } = useTranslation()
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | null
  const [loading, setLoading] = useState(true)
  const [myStatus, setMyStatus] = useState(null)
  const [view, setView] = useState(() => (new Date() >= new Date('2026-06-28T00:00:00-03:00') ? 'playoffs' : 'groups')) // 'dates' | 'groups' | 'playoffs'
  const [activeGroup, setActiveGroup] = useState('A')

  // Pagination + swipe for playoffs view
  const [bracketOffset, setBracketOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const swipeTouchStart = useRef(null)

  const simulatedBracket = useMemo(() => {
    if (!tournament?.competitions?.name?.toLowerCase().includes('world cup')) return {}
    return simulateWorldCupBracket(matches, predictions)
  }, [matches, predictions, tournament])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (!mobile) {
        setBracketOffset(prev => Math.max(0, prev - 1)) // try to recover second column if switching back to desktop
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Use a ref to store pending changes and a timeout for debouncing
  const pendingChanges = useRef({})
  const timeoutRef = useRef(null)

  useEffect(() => { loadAll() }, [tournamentId, user])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: tr } = await supabase
        .from('tournaments')
        .select('*, competitions(name, type, available_modes)')
        .eq('id', tournamentId).single()
      setTournament(tr)

      const { data: tp } = await supabase
        .from('tournament_players')
        .select('status, role')
        .eq('tournament_id', tournamentId).eq('user_id', user.id).single()
      setMyStatus(tp?.status ?? null)

      // Only load matches if this is a partidos tournament
      if (tr?.mode === 'partidos') {
        const { data: ms } = await supabase
          .from('matches')
          .select('*, home_team:teams!home_team_id(name, code, group_name, initial_position), away_team:teams!away_team_id(name, code, group_name, initial_position)')
          .eq('competition_id', tr?.competition_id)
          .order('kickoff_at')
        setMatches(ms ?? [])

        const { data: preds } = await supabase
          .from('match_predictions')
          .select('match_id, home_goals, away_goals, pen_pick')
          .eq('tournament_id', tournamentId).eq('user_id', user.id)

        const predMap = {}
        for (const p of preds ?? []) {
          predMap[p.match_id] = { home_goals: p.home_goals ?? '', away_goals: p.away_goals ?? '', pen_pick: p.pen_pick ?? '' }
        }
        setPredictions(predMap)
      }
    } finally {
      setLoading(false)
    }
  }

  function isLocked(match) {
    return new Date(match.kickoff_at) <= new Date(Date.now() + 60 * 60 * 1000)
  }

  function updatePred(matchId, field, value) {
    setPredictions(prev => {
      const current = prev[matchId] ?? { home_goals: '', away_goals: '', pen_pick: '' }
      let next = { ...current, [field]: value }

      // If updating one goal and the other is empty, set it to zero
      if (field === 'home_goals' && (current.away_goals === '' || current.away_goals === undefined)) {
        next.away_goals = '0'
      } else if (field === 'away_goals' && (current.home_goals === '' || current.home_goals === undefined)) {
        next.home_goals = '0'
      }

      // Keep pending changes in sync
      pendingChanges.current[matchId] = {
        ...(pendingChanges.current[matchId] ?? {}),
        ...next
      }

      return { ...prev, [matchId]: next }
    })

    // Debounce the save operation
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    
    timeoutRef.current = setTimeout(() => {
      savePendingChanges()
    }, 2000)
  }

  async function savePendingChanges() {
    const changesToSave = { ...pendingChanges.current }
    if (Object.keys(changesToSave).length === 0) return

    // Clear pending changes as we are about to save them
    pendingChanges.current = {}
    setSaving(true)

    try {
      const payloads = Object.keys(changesToSave).map(matchId => {
        // Merge pending changes with the existing predictions state for this match
        const currentPred = predictions[matchId] ?? {}
        const merged = { ...currentPred, ...changesToSave[matchId] }
        
        const home = merged.home_goals !== '' && merged.home_goals !== undefined ? parseInt(merged.home_goals) : 0
        const away = merged.away_goals !== '' && merged.away_goals !== undefined ? parseInt(merged.away_goals) : 0
        
        return {
          tournament_id: tournamentId,
          user_id: user.id,
          match_id: matchId,
          home_goals: home,
          away_goals: away,
          pen_pick: merged.pen_pick || null,
        }
      })

      if (payloads.length > 0) {
        await supabase.from('match_predictions').upsert(payloads, { onConflict: 'tournament_id,user_id,match_id' })
      }
      
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? null : prev) // Only clear if it hasn't switched back to 'saving'
      }, 3000)
    } catch (error) {
      console.error('Error saving predictions', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const byStage = {}
  for (const m of matches) {
    if (!byStage[m.stage]) byStage[m.stage] = []
    byStage[m.stage].push(m)
  }

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  if (myStatus !== 'approved') return (
    <AppShell>
      <div className="home-empty card card-sm" style={{ marginTop: '2rem' }}>
        <span style={{ fontSize: '2rem' }}>🔒</span>
        <p style={{ color: 'var(--text-muted)' }}>{t('predictions.no_access')}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/torneo/${tournamentId}`)}>
          ← {t('common.back')}
        </button>
      </div>
    </AppShell>
  )
  // ── Route to posiciones page ─────────────────────────────
  if (tournament?.mode === 'posiciones') {
    return <PosicionesPredictionsPage tournament={tournament} />
  }

  // ── Partidos page (match results) ────────────────────────
  const hasMatches = matches.length > 0
  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']

  // ── TABLE CALCULATION (for Group View) ───────────────────
  function calculateGroupTable(groupMatches, preds) {
    const table = {}
    groupMatches.forEach(m => {
      // Initialize rows if they don't exist
      if (m.home_team && !table[m.home_team_id]) {
        table[m.home_team_id] = { id: m.home_team_id, code: m.home_team.code, name: m.home_team.name, initial_position: m.home_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
      }
      if (m.away_team && !table[m.away_team_id]) {
        table[m.away_team_id] = { id: m.away_team_id, code: m.away_team.code, name: m.away_team.name, initial_position: m.away_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
      }

      const p = preds[m.id]
      if (p && p.home_goals !== '' && p.away_goals !== '') {
        const hg = parseInt(p.home_goals), ag = parseInt(p.away_goals)
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

  const groupMatches = matches.filter(m => m.stage === 'group')
  const playoffStages = STAGE_ORDER.filter(s => s !== 'group' && byStage[s]?.length)


  return (
    <AppShell saveIndicator={saveStatus}>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/torneo/${tournamentId}`)}>
              ← {tournament?.name}
            </button>
            <div>
              <h2 className="home-section-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                {t('predictions.title')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                {t('predictions.lock_info')}
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
             <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
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

        {!hasMatches && (
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>📅</span>
            <p style={{ color: 'var(--text-muted)' }}>
              {t('tournaments.no_matches_found')}
            </p>
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
              {byStage[stage].map(match => (
                <MatchCard key={match.id} match={match} pred={predictions[match.id] ?? {}} locked={isLocked(match)} onChange={(f,v) => updatePred(match.id,f,v)} t={t} />
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
                {groupMatches.filter(m => m.home_team?.group_name === activeGroup).map(match => (
                  <MatchCard key={match.id} match={match} pred={predictions[match.id] ?? {}} locked={isLocked(match)} onChange={(f,v) => updatePred(match.id,f,v)} t={t} />
                ))}
              </div>
            </div>
            <div className="table-column">
              <GroupTable 
                rows={calculateGroupTable(groupMatches.filter(m => m.home_team?.group_name === activeGroup), predictions)}
                t={t}
              />
            </div>
          </div>
        )}

        {/* --- VIEW: PLAYOFFS --- */}
        {view === 'playoffs' && (() => {
          const bracketStages = playoffStages.filter(s => s !== 'third_place')
          const visibleCount = isMobile ? 2 : 4
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
              <div style={{ overflow: 'hidden', borderRadius: 'var(--r-md)', marginBottom: '1rem', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
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
                      {t(`predictions.stages.${stage}`)}
                    </h3>
                  ))}
                </div>
              </div>

              {/* Bracket */}
              <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <BracketTree
                  byStage={byStage}
                  bracketStages={bracketStages}
                  simulatedBracket={simulatedBracket}
                  predictions={predictions}
                  isLocked={isLocked}
                  updatePred={updatePred}
                  t={t}
                  colPct={colPct}
                  translatePct={translatePct}
                  offset={safeOffset}
                  visibleCount={visibleCount}
                />
              </div>

              {/* Third place */}
              {byStage['third_place']?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
                    🥉 {t('predictions.stages.third_place')}
                  </h3>
                  {byStage['third_place'].map(match => (
                    <MatchCard stacked={true} key={match.id}
                      match={{ ...match, home_team: simulatedBracket[match.round]?.home_team || match.home_team, away_team: simulatedBracket[match.round]?.away_team || match.away_team }}
                      pred={predictions[match.id] ?? {}} locked={isLocked(match)} onChange={(f, v) => updatePred(match.id, f, v)} t={t} />
                  ))}
                </div>
              )}

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


// ─── WC2026 bracket tree ──────────────────────────────────────────────────
const WC2026_CHILDREN = {
  89:[73,75],90:[74,77],91:[76,78],92:[79,80],
  93:[81,84],94:[82,86],95:[85,88],96:[83,87],
  97:[89,90],98:[91,92],99:[93,94],100:[95,96],
  101:[97,98],102:[99,100],104:[101,102],
}
const BRACKET_STAGE_ROUNDS = {
  r32:[73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88],
  r16:[89,90,91,92,93,94,95,96],
  qf:[97,98,99,100],
  sf:[101,102],
  final:[104],
}

// Height of one match card (px) + gap between cards in a pair
const CARD_H = 106   // approximate rendered height of a stacked MatchCard
const CARD_GAP = 8   // gap between two cards within a pair
const PAIR_GAP = 8   // gap between pairs in a column

// Height that a pair of N cards occupies in the first (leftmost) column
// Subsequent columns: each parent pair = height of its two child pairs combined
function pairHeightForDepth(depth) {
  // depth 0 = R32 column: each pair has 2 cards
  // depth 1 = R16: each pair corresponds to 2 pairs from R32
  // depth d: each pair = 2^d cards-worth of height
  const cards = Math.pow(2, depth)
  return cards * CARD_H + (cards - 1) * CARD_GAP + (cards / 2 - 1) * PAIR_GAP * 2
}

function BracketTree({ byStage, bracketStages, simulatedBracket, predictions, isLocked, updatePred, t, colPct, translatePct, offset, visibleCount }) {
  const matchByRound = {}
  Object.values(byStage).flat().forEach(m => { if (m.round) matchByRound[m.round] = m })
  const hasRoundData = Object.keys(matchByRound).some(r => parseInt(r) >= 73)

  const stageRounds = bracketStages.map(s => (BRACKET_STAGE_ROUNDS[s] || []).filter(r => matchByRound[r]))

  function getPairs(stageIdx) {
    const rounds = stageRounds[stageIdx] || []
    if (!rounds.length) return []
    const nextRounds = stageRounds[stageIdx + 1] || []
    if (!nextRounds.length) return rounds.map(r => [r])
    const childToParent = {}
    nextRounds.forEach(pr => (WC2026_CHILDREN[pr] || []).forEach(c => { childToParent[c] = pr }))
    const parentToChildren = {}
    rounds.forEach(r => {
      const pr = childToParent[r]
      if (pr != null) { if (!parentToChildren[pr]) parentToChildren[pr] = []; parentToChildren[pr].push(r) }
    })
    return nextRounds.map(pr => parentToChildren[pr]).filter(Boolean)
  }

  const renderMatch = (round) => {
    const match = matchByRound[round]
    if (!match) return <div key={round} style={{ height: CARD_H }} />
    const enriched = {
      ...match,
      home_team: simulatedBracket[round]?.home_team || match.home_team,
      away_team: simulatedBracket[round]?.away_team || match.away_team,
    }
    return (
      <MatchCard key={match.id} stacked={true} match={enriched}
        pred={predictions[match.id] ?? {}} locked={isLocked(match)}
        onChange={(f, v) => updatePred(match.id, f, v)} t={t} />
    )
  }

  const CONN = 20 // px connector width

  // For each column, compute the "depth" relative to the leftmost column (R32 = depth 0)
  // This drives how tall each pair-slot is
  const baseStage = bracketStages[0]
  const baseRoundsPerPair = 2 // R32 always has pairs of 2 matches

  return (
    <div style={{ overflowX: 'clip', overflowY: 'visible' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'nowrap',
        transform: `translateX(${translatePct}%)`,
        transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
        padding: '0.5rem 0',
        alignItems: 'flex-start',
      }}>
        {bracketStages.map((stage, si) => {
          const pairs = hasRoundData ? getPairs(si) : (stageRounds[si] || []).map(r => [r])
          const isLast = si === bracketStages.length - 1
          const isFirst = si === 0

          // Depth relative to first bracket stage
          // R32=0, R16=1, QF=2, SF=3, Final=4
          // Each step doubles the pair height
          const depth = si

          // Height of a single pair-slot at this depth
          // depth 0: 2 cards
          // depth 1: equivalent to 2 pairs from depth 0 = 4 cards worth
          const slotH = pairHeightForDepth(depth)

          return (
            <div key={stage} style={{
              flex: `0 0 ${colPct}%`,
              width: `${colPct}%`,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              paddingRight: isLast ? 0 : CONN + 'px',
              gap: 0,
            }}>
              {pairs.map((pair, pi) => {
                // Each pair-slot has a fixed height based on depth
                // This ensures: 2 slots at depth N == 1 slot at depth N+1
                const isLastPair = pi === pairs.length - 1
                return (
                  <div key={pi} style={{
                    height: slotH,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    justifyContent: 'space-around',
                    marginBottom: isLastPair ? 0 : PAIR_GAP * 2,
                  }}>
                    {pair.map((round, ri) => (
                      <div key={round} style={{
                        height: CARD_H,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}>
                        {renderMatch(round)}
                      </div>
                    ))}

                    {/* Bracket connectors */}
                    {!isLast && (
                      <>
                        {pair.length === 2 ? (
                          <>
                            {/* Bracket: ╡ — vertical bar from 1st card center to 2nd card center, with horizontal stub */}
                            <div style={{
                              position: 'absolute',
                              right: -CONN,
                              // Top: center of first card
                              top: CARD_H / 2,
                              // Height: distance between the two card centers
                              height: slotH - CARD_H,
                              width: CONN / 2,
                              borderTop: '2px solid var(--border-strong)',
                              borderBottom: '2px solid var(--border-strong)',
                              borderRight: '2px solid var(--border-strong)',
                              borderTopRightRadius: 5,
                              borderBottomRightRadius: 5,
                              pointerEvents: 'none',
                              boxSizing: 'border-box',
                            }} />
                            {/* Horizontal stub from midpoint to right */}
                            <div style={{
                              position: 'absolute',
                              right: -CONN,
                              top: slotH / 2,
                              width: CONN,
                              borderBottom: '2px solid var(--border-strong)',
                              pointerEvents: 'none',
                            }} />
                          </>
                        ) : (
                          <div style={{
                            position: 'absolute',
                            right: -CONN,
                            top: '50%',
                            width: CONN,
                            borderBottom: '2px solid var(--border-strong)',
                            pointerEvents: 'none',
                          }} />
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
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
        </table>      </div>
    </div>
  )
}

function MatchCard({ match, pred, locked, saving, saved, onChange, onSave, t, stacked }) {
  const home = t(`teams.${match.home_team?.code}`, { defaultValue: match.home_team?.name ?? '?' })
  const away = t(`teams.${match.away_team?.code}`, { defaultValue: match.away_team?.name ?? '?' })
  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    + ' ' + kickoff.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const hasResult = match.home_goals !== null
  const isElim = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'].includes(match.stage)
  const showPens = isElim && !locked
    && pred.home_goals !== '' && pred.away_goals !== ''
    && parseInt(pred.home_goals) === parseInt(pred.away_goals)

  const predFilled = (pred.home_goals !== '' && pred.home_goals !== undefined) || (pred.away_goals !== '' && pred.away_goals !== undefined)

  return (
    <div className={`card card-sm ${stacked ? 'match-card-stacked' : ''}`} style={{
      opacity: locked && !predFilled ? 0.8 : 1,
      borderColor: saved ? 'var(--primary)' : undefined,
      padding: '0.75rem 0.875rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kickoffStr}</span>
          {match.venue && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', fontStyle: 'normal',
                opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              • {match.venue}
            </span>
          )}
        </div>
        {locked && (
          <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>
            🔒 {hasResult ? t('predictions.finished') : t('predictions.locked')}
          </span>
        )}
      </div>

      <div className="match-card-grid">
        {stacked ? (
          <>
            <div className="match-team-col home">
              <TeamFlag code={match.home_team?.code} size={16} />
              <span className="match-team-name">{home}</span>
            </div>
            <div className="match-team-col away">
              <TeamFlag code={match.away_team?.code} size={16} />
              <span className="match-team-name">{away}</span>
            </div>
            <div className="match-center-col">
              {hasResult ? (
                <>
                  <ResultBubble val={match.home_goals} />
                  <ResultBubble val={match.away_goals} />
                </>
              ) : locked ? (
                <>
                  <ResultBubble val={pred.home_goals !== '' ? pred.home_goals : '?'} muted={pred.home_goals === ''} />
                  <ResultBubble val={pred.away_goals !== '' ? pred.away_goals : '?'} muted={pred.away_goals === ''} />
                </>
              ) : (
                <>
                  <GoalInput val={pred.home_goals ?? ''} onChange={v => onChange('home_goals', v)} />
                  <GoalInput val={pred.away_goals ?? ''} onChange={v => onChange('away_goals', v)} />
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="match-team-col home">
              <span className="match-team-name">{home}</span>
              <TeamFlag code={match.home_team?.code} />
            </div>
            <div className="match-center-col">
              {hasResult ? (
                <div className="match-center-col">
                  <ResultBubble val={match.home_goals} />
                  <span className="match-vs-sep" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
                  <ResultBubble val={match.away_goals} />
                </div>
              ) : locked ? (
                <div className="match-center-col">
                  <ResultBubble val={pred.home_goals !== '' ? pred.home_goals : '?'} muted={pred.home_goals === ''} />
                  <span className="match-vs-sep" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
                  <ResultBubble val={pred.away_goals !== '' ? pred.away_goals : '?'} muted={pred.away_goals === ''} />
                </div>
              ) : (
                <div className="match-center-col">
                  <GoalInput val={pred.home_goals ?? ''} onChange={v => onChange('home_goals', v)} />
                  <span className="match-vs-sep" style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem' }}>vs</span>
                  <GoalInput val={pred.away_goals ?? ''} onChange={v => onChange('away_goals', v)} />
                </div>
              )}
            </div>
            <div className="match-team-col away">
              <TeamFlag code={match.away_team?.code} />
              <span className="match-team-name">{away}</span>
            </div>
          </>
        )}
      </div>

      {showPens && (
        <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('predictions.pen_winner')}:</span>
          {[home, away].map((team, i) => (
            <button key={i}
              className={`btn btn-sm ${pred.pen_pick === (i === 0 ? 'home' : 'away') ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.625rem' }}
              onClick={() => onChange('pen_pick', i === 0 ? 'home' : 'away')}>
              {team}
            </button>
          ))}
        </div>
      )}

      {hasResult && predFilled && (
        <PredResult match={match} pred={pred} t={t} />
      )}

    </div>
  )
}

function GoalInput({ val, onChange, matchId, side }) {
  const inputRef = useRef(null)
  const num = val === '' ? null : parseInt(val)
  const inc = () => onChange(String(num === null ? 1 : Math.min(20, num + 1)))
  const dec = () => {
    if (num === null) onChange('0')
    else if (num > 0) onChange(String(num - 1))
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
      // Jump 2 positions down (same column: home→home or away→away)
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
      onChange('')
    } else {
      const n = Math.min(20, parseInt(raw))
      onChange(String(n))
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

function ResultBubble({ val, muted }) {
  return (
    <span className="result-bubble" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '2rem', height: '2rem', borderRadius: 'var(--r-md)',
      background: muted ? 'var(--surface-2)' : 'var(--surface-3)',
      fontWeight: 800, fontSize: '1rem',
      color: muted ? 'var(--text-subtle)' : 'var(--text)',
    }}>
      {val}
    </span>
  )
}

function PredResult({ match, pred, t }) {
  const pHome = parseInt(pred.home_goals)
  const pAway = parseInt(pred.away_goals)
  const rHome = match.home_goals
  const rAway = match.away_goals

  const exactBoth = pHome === rHome && pAway === rAway
  const predWinner = pHome > pAway ? 'home' : pHome < pAway ? 'away' : 'draw'
  const realWinner = match.winner
  const correctWinner = predWinner === realWinner

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.625rem',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.9rem' }}>
        {exactBoth ? '🎯' : correctWinner ? '✅' : '❌'}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {t('predictions.result')}: {rHome}-{rAway}
        {exactBoth ? ` · ${t('predictions.exact')}` : correctWinner ? ` · ${t('predictions.winner_ok')}` : ` · ${t('predictions.miss')}`}
      </span>
    </div>
  )
}
