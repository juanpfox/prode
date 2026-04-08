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
