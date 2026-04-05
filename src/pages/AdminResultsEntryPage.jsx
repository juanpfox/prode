import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

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

export default function AdminResultsEntryPage() {
  const { t } = useTranslation()
  const { competitionId } = useParams()
  const navigate = useNavigate()

  const [competition, setCompetition] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('groups') // 'dates' | 'groups' | 'playoffs'
  const [activeGroup, setActiveGroup] = useState('A')
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | null
  const [bracketOffset, setBracketOffset] = useState(0)

  const pendingChanges = useRef({})
  const timeoutRef = useRef(null)

  useEffect(() => { loadData() }, [competitionId])

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
      
      // Determine default active group from first match
      const firstGroupMatch = ms?.find(m => m.stage === 'group' && m.home_team?.group_name)
      if (firstGroupMatch) setActiveGroup(firstGroupMatch.home_team.group_name)
      
    } finally {
      setLoading(false)
    }
  }

  function updateMatch(matchId, field, value) {
    const match = matches.find(m => m.id === matchId)
    if (!match) return

    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m
      
      let next = { ...m, [field]: value }
      
      // Auto-calculate winner
      if (field === 'home_goals' || field === 'away_goals' || field === 'went_to_pens' || field === 'pen_winner') {
        const hg = next.home_goals !== null ? parseInt(next.home_goals) : null
        const ag = next.away_goals !== null ? parseInt(next.away_goals) : null
        
        if (hg !== null && ag !== null) {
          if (hg > ag) next.winner = 'home'
          else if (hg < ag) next.winner = 'away'
          else next.winner = 'draw'
          
          // If draw in knockout, handle pens
          const isElim = STAGE_ORDER.indexOf(next.stage) > 0
          if (isElim && hg === ag) {
             // keep went_to_pens and pen_winner as is unless manually changed
          } else {
             next.went_to_pens = false
             next.pen_winner = null
          }
        } else {
          next.winner = null
        }
      }
      
      pendingChanges.current[matchId] = {
        home_goals: next.home_goals,
        away_goals: next.away_goals,
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
      setTimeout(() => setSaveStatus(null), 3000)
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Admin: Carga de Resultados</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className={`btn btn-sm ${view === 'groups' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('groups')}>Groups</button>
             <button className={`btn btn-sm ${view === 'playoffs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('playoffs')}>PlayOffs</button>
             <button className={`btn btn-sm ${view === 'dates' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('dates')}>Dates</button>
          </div>
        </div>

        {view === 'groups' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem' }}>
            {groupLetters.map(l => (
              <button key={l} onClick={() => setActiveGroup(l)} 
                className={`btn btn-sm ${activeGroup === l ? 'btn-primary' : 'btn-ghost'}`} 
                style={{ width: '2.2rem', height: '2.2rem', padding: 0 }}>{l}</button>
            ))}
          </div>
        )}

        {view === 'dates' && STAGE_ORDER.filter(s => byStage[s]?.length).map(stage => (
          <section key={stage} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {stage}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {byStage[stage].map(m => <AdminMatchCard key={m.id} match={m} onChange={updateMatch} t={t} />)}
            </div>
          </section>
        ))}

        {view === 'groups' && (
          <div className="predictions-layout-grid">
            <div className="matches-column">
              <h3 style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                Group {activeGroup}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {matches.filter(m => m.stage === 'group' && m.home_team?.group_name === activeGroup).map(m => (
                  <AdminMatchCard key={m.id} match={m} onChange={updateMatch} t={t} />
                ))}
              </div>
            </div>
            <div className="table-column">
              <GroupTable 
                rows={calculateGroupTable(matches.filter(m => m.stage === 'group' && m.home_team?.group_name === activeGroup))}
                t={t}
              />
            </div>
          </div>
        )}

        {view === 'playoffs' && (() => {
          const playoffStages = STAGE_ORDER.filter(s => s !== 'group' && byStage[s]?.length)
          const bracketStages = playoffStages.filter(s => s !== 'third_place')
          const visibleStages = bracketStages.slice(bracketOffset, bracketOffset + 2)
          return (
            <div style={{ paddingBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                <button className="btn btn-icon" onClick={() => setBracketOffset(v => Math.max(0, v - 1))} disabled={bracketOffset === 0}>&lt;</button>
                <div style={{ display: 'flex', gap: '2.5rem', flex: 1, justifyContent: 'center' }}>
                  {visibleStages.map(stage => <h3 key={stage} style={{ width: '320px', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>{stage}</h3>)}
                </div>
                <button className="btn btn-icon" onClick={() => setBracketOffset(v => Math.min(bracketStages.length - 2, v + 1))} disabled={bracketOffset >= bracketStages.length - 2 || bracketStages.length < 2}>&gt;</button>
              </div>

              <div className="playoff-bracket" style={{ justifyContent: 'center' }}>
                {visibleStages.map((stage, index) => (
                  <div key={stage} className="bracket-column">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {byStage[stage].map(m => (
                        <div key={m.id} className="bracket-match-cell">
                          <AdminMatchCard match={m} onChange={updateMatch} t={t} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
      {/* ... previous content of GroupTable from PredictionsPage ... */}
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

function AdminMatchCard({ match, onChange, t }) {
  const home = t(`teams.${match.home_team?.code}`, { defaultValue: match.home_team?.name ?? '?' })
  const away = t(`teams.${match.away_team?.code}`, { defaultValue: match.away_team?.name ?? '?' })
  
  const isElim = STAGE_ORDER.indexOf(match.stage) > 0
  const showPens = isElim && match.home_goals !== null && match.away_goals !== null && parseInt(match.home_goals) === parseInt(match.away_goals)

  return (
    <div className="card card-sm">
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        {new Date(match.kickoff_at).toLocaleDateString()} {new Date(match.kickoff_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
      <div className="match-card-grid">
        <div className="match-team-col home">
          <span className="match-team-name">{home}</span>
          <TeamFlag code={match.home_team?.code} />
        </div>
        <div className="match-center-col">
          <AdminGoalInput val={match.home_goals ?? ''} onChange={v => onChange(match.id, 'home_goals', v)} />
          <span style={{ fontWeight: 800 }}>-</span>
          <AdminGoalInput val={match.away_goals ?? ''} onChange={v => onChange(match.id, 'away_goals', v)} />
        </div>
        <div className="match-team-col away">
          <TeamFlag code={match.away_team?.code} />
          <span className="match-team-name">{away}</span>
        </div>
      </div>
      
      {showPens && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
           <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
             <input type="checkbox" checked={match.went_to_pens} onChange={e => onChange(match.id, 'went_to_pens', e.target.checked)} /> Pens?
           </label>
           {match.went_to_pens && (
             <div style={{ display: 'flex', gap: '0.5rem' }}>
               <button className={`btn btn-sm ${match.pen_winner === 'home' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(match.id, 'pen_winner', 'home')}>Winner H</button>
               <button className={`btn btn-sm ${match.pen_winner === 'away' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(match.id, 'pen_winner', 'away')}>Winner A</button>
             </div>
           )}
        </div>
      )}
    </div>
  )
}

function AdminGoalInput({ val, onChange }) {
  return (
    <input 
      type="number" 
      value={val} 
      onChange={e => onChange(e.target.value === '' ? null : parseInt(e.target.value))}
      style={{
        width: '3rem',
        padding: '0.4rem',
        textAlign: 'center',
        background: 'var(--surface-3)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-md)',
        fontWeight: 800,
        fontSize: '1rem'
      }}
    />
  )
}
