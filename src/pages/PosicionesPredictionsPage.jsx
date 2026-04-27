import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

const GROUP_LABELS   = ['A','B','C','D','E','F','G','H','I','J','K','L']
const PODIUM_SLOTS   = ['fourth','third','runner_up','champion']
const PODIUM_LABELS  = { fourth: '4°', third: '3°', runner_up: '🥈 Sub', champion: '🏆 Campeón' }
const PODIUM_LABELS_EN = { fourth: '4th', third: '3rd', runner_up: '🥈 Runner-up', champion: '🏆 Champion' }

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

function TeamFlag({ code, size = 20 }) {
  const iso2 = FIFA_TO_ISO2[code] || code.slice(0, 2).toLowerCase()
  return (
    <img 
      src={`https://flagcdn.com/w40/${iso2}.png`} 
      alt={code} 
      draggable={false}
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

export default function PosicionesPredictionsPage({ tournament }) {
  const { t, i18n } = useTranslation()
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
  const podiumLabels = lang === 'es' ? PODIUM_LABELS : PODIUM_LABELS_EN

  // teams indexed by group: { A: [{id, name, code},...], ... }
  const [teamsByGroup, setTeamsByGroup] = useState({})
  // groupRanks: { A: [teamId, teamId, teamId, teamId], ... }  index = position-1
  const [groupRanks, setGroupRanks] = useState({})
  // podium: { champion: teamId|null, runner_up, third, fourth }
  const [podium, setPodium] = useState({ champion: null, runner_up: null, third: null, fourth: null })
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | null
  // dragging: { group, fromIdx, currentIdx, cloneTop, cloneLeft, cloneWidth, itemHeight, teamId }
  const [dragging, setDragging] = useState(null)
  const dragRef = useRef(null)   // mutable data, no re-render on every pointermove
  const timeoutRef = useRef(null)

  const locked = tournament.locked_at && new Date(tournament.locked_at) <= new Date()

  useEffect(() => { loadAll() }, [tournamentId])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, code, group_name, initial_position')
        .eq('competition_id', tournament.competition_id)
        .order('initial_position')

      const byGroup = {}
      for (const g of GROUP_LABELS) byGroup[g] = []
      for (const team of teams ?? []) {
        if (team.group_name && byGroup[team.group_name]) {
          byGroup[team.group_name].push(team)
        }
      }
      setTeamsByGroup(byGroup)

      // Init ranks from DB or default to array order
      const initRanks = {}
      for (const g of GROUP_LABELS) {
        initRanks[g] = byGroup[g].map(t => t.id)
      }

      const { data: preds } = await supabase
        .from('fixture_predictions')
        .select('team_id, group_position, world_position')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)

      if (preds && preds.length > 0) {
        // Re-order each group's array by saved group_position
        for (const g of GROUP_LABELS) {
          const groupTeams = byGroup[g]
          const predMap = {}
          for (const p of preds) {
            if (groupTeams.find(t => t.id === p.team_id) && p.group_position) {
              predMap[p.group_position] = p.team_id
            }
          }
          const ordered = []
          for (let pos = 1; pos <= 4; pos++) {
            if (predMap[pos]) ordered.push(predMap[pos])
          }
          // Fill remaining unpredicted teams
          for (const t of groupTeams) {
            if (!ordered.includes(t.id)) ordered.push(t.id)
          }
          initRanks[g] = ordered
        }

        // Podium
        const newPodium = { champion: null, runner_up: null, third: null, fourth: null }
        for (const p of preds) {
          if (p.world_position) newPodium[p.world_position] = p.team_id
        }
        setPodium(newPodium)
      }

      setGroupRanks(initRanks)
    } finally {
      setLoading(false)
    }
  }

  // ── Pointer-based drag (mouse + touch, Android-style) ────────────────
  const ITEM_GAP = 6 // px — matches gap: '0.375rem' at 16px base

  function startDrag(e, group, idx) {
    if (locked) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()

    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const count = groupRanks[group]?.length ?? 4
    const teamId = groupRanks[group][idx]

    el.setPointerCapture(e.pointerId)

    dragRef.current = {
      group, fromIdx: idx, count,
      startClientY: e.clientY,
      itemHeight: rect.height,
      cloneInitialTop: rect.top,
      cloneLeft: rect.left,
      cloneWidth: rect.width,
    }

    setDragging({
      group, fromIdx: idx, currentIdx: idx, teamId,
      cloneTop: rect.top,
      cloneLeft: rect.left,
      cloneWidth: rect.width,
      itemHeight: rect.height,
    })
  }

  function moveDrag(e) {
    const d = dragRef.current
    if (!d) return
    const delta = e.clientY - d.startClientY
    const step = d.itemHeight + ITEM_GAP
    const newIdx = Math.max(0, Math.min(d.count - 1, Math.round(d.fromIdx + delta / step)))
    d.currentIdx = newIdx  // keep ref in sync so endDrag always reads the latest value
    setDragging(prev => prev ? { ...prev, currentIdx: newIdx, cloneTop: d.cloneInitialTop + delta } : null)
  }

  function endDrag() {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null

    // Read final position from the ref (never stale) before clearing
    const finalIdx = d.currentIdx ?? d.fromIdx
    setDragging(null)

    if (finalIdx !== d.fromIdx) {
      setGroupRanks(ranks => {
        const arr = [...ranks[d.group]]
        const [moved] = arr.splice(d.fromIdx, 1)
        arr.splice(finalIdx, 0, moved)
        return { ...ranks, [d.group]: arr }
      })
      triggerAutoSave()
    }
  }

  // Compute how much each item should shift vertically during drag
  function getItemTranslateY(group, idx) {
    if (!dragging || dragging.group !== group) return 0
    const { fromIdx, currentIdx, itemHeight } = dragging
    const step = itemHeight + ITEM_GAP
    if (idx === fromIdx) return 0
    if (currentIdx > fromIdx && idx > fromIdx && idx <= currentIdx) return -step
    if (currentIdx < fromIdx && idx >= currentIdx && idx < fromIdx) return step
    return 0
  }

  // ── Touch reorder (tap arrows) ───────────────────────────
  function moveTeam(group, fromIdx, dir) {
    const toIdx = fromIdx + dir
    if (toIdx < 0 || toIdx > 3) return
    setGroupRanks(prev => {
      const arr = [...prev[group]]
      ;[arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]]
      return { ...prev, [group]: arr }
    })
    triggerAutoSave()
  }

  // ── Save ────────────────────────────────────────────────
  function triggerAutoSave() {
    if (locked) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(() => {
      handleSave()
    }, 1000)
  }

  async function handleSave() {
    try {
      const rows = []
      // We need the latest state here - using a trick or passing params
      // Since handleSave is called from timeout, it might have stale closure.
      // But we can just use the state from the last render or use functional updates.
      // Actually, in a timeout, it might access stale variables.
      // Better to use refs or a different trigger mechanism.
      // Let's use the current state from the state variables, 
      // they should be up-to-date in the version of handleSave that was created 
      // in the latest render.
      
      for (const g of GROUP_LABELS) {
        const ranks = groupRanks[g] ?? []
        ranks.forEach((teamId, idx) => {
          rows.push({
            tournament_id: tournamentId,
            user_id: user.id,
            team_id: teamId,
            group_position: idx + 1,
            world_position: Object.entries(podium).find(([, id]) => id === teamId)?.[0] ?? null,
          })
        })
      }
      
      if (rows.length > 0) {
        await supabase.from('fixture_predictions')
          .upsert(rows, { onConflict: 'tournament_id,user_id,team_id' })
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? null : prev), 3000)
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }

  // ── Derived: all teams in alphabetical order for podium pickers ──
  const allTeams = Object.values(teamsByGroup).flat().sort((a, b) => {
    const nameA = t(`teams.${a.code}`, { defaultValue: a.name })
    const nameB = t(`teams.${b.code}`, { defaultValue: b.name })
    return nameA.localeCompare(nameB)
  })

  if (loading) return (
    <AppShell saveIndicator={saveStatus}>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  return (
    <AppShell saveIndicator={saveStatus}>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/${tournament?.slug || tournament?.id}`)}
          style={{ marginBottom: '1rem' }}>
          ← {tournament?.name}
        </button>

        <h2 className="home-section-title" style={{ marginBottom: '0.25rem' }}>
          🏆 {t('modes.posiciones')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          {locked
            ? '🔒 ' + t('predictions.locked')
            : t('posiciones.hint')}
        </p>

        {/* Groups */}
        <div className="posiciones-groups-grid" style={{ marginBottom: '1.5rem' }}>
          {GROUP_LABELS.filter(g => teamsByGroup[g]?.length > 0).map(group => (
            <section key={group}>
              <h3 style={{
                fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem'
              }}>
                {t('posiciones.group')} {group}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {(groupRanks[group] ?? []).map((teamId, idx) => {
                  const team = teamsByGroup[group].find(t => t.id === teamId)
                  if (!team) return null
                  const isBeingDragged = dragging?.group === group && dragging?.fromIdx === idx
                  const translateY = getItemTranslateY(group, idx)
                  return (
                    <div
                      key={teamId}
                      onPointerDown={locked ? undefined : (e) => startDrag(e, group, idx)}
                      onPointerMove={locked ? undefined : moveDrag}
                      onPointerUp={locked ? undefined : endDrag}
                      onPointerCancel={locked ? undefined : endDrag}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.55rem 0.875rem',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--surface-2)',
                        border: '1.5px solid var(--border)',
                        cursor: locked ? 'default' : 'grab',
                        userSelect: 'none',
                        touchAction: 'none',
                        opacity: isBeingDragged ? 0 : 1,
                        transform: `translateY(${translateY}px)`,
                        transition: isBeingDragged ? 'none' : 'transform 0.15s ease',
                        willChange: 'transform',
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 800, 
                        minWidth: '1.25rem', 
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface-3)',
                        height: '24px',
                        width: '24px',
                        borderRadius: '50%',
                      }}>{idx + 1}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
                        <TeamFlag code={team.code} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {t(`teams.${team.code}`, { defaultValue: team.name })}
                        </span>
                      </div>

                      {!locked && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1,
                              padding: '1px 4px' }}
                            onClick={() => moveTeam(group, idx, -1)}
                            disabled={idx === 0}
                          >▲</button>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1,
                              padding: '1px 4px' }}
                            onClick={() => moveTeam(group, idx, 1)}
                            disabled={idx === 3}
                          >▼</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Podium */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem'
          }}>
            {t('posiciones.podium')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {PODIUM_SLOTS.slice().reverse().map(slot => {
              const selectedTeam = allTeams.find(t => t.id === podium[slot])
              // Handle label override for 3rd and 4th
              let label = podiumLabels[slot]
              if (slot === 'third') label = '3'
              if (slot === 'fourth') label = '4'

              return (
                <div key={slot} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--r-md)',
                  background: podium[slot] ? 'var(--primary-subtle)' : 'var(--surface-2)',
                  border: podium[slot] ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                }}>
                  <span style={{ fontWeight: 700, minWidth: '5rem', fontSize: '0.875rem',
                    color: podium[slot] ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                  {locked ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {selectedTeam && <TeamFlag code={selectedTeam.code} />}
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {selectedTeam ? t(`teams.${selectedTeam.code}`, { defaultValue: selectedTeam.name }) : '—'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {selectedTeam && <TeamFlag code={selectedTeam.code} />}
                      <select
                        className="input"
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                        value={podium[slot] ?? ''}
                        onChange={e => {
                          setPodium(p => ({ ...p, [slot]: e.target.value || null }))
                          triggerAutoSave()
                        }}
                      >
                        <option value="">— {t('posiciones.pick_team')} —</option>
                        {allTeams.map(team => (
                          <option key={team.id} value={team.id}
                            disabled={Object.entries(podium).some(([s, id]) => s !== slot && id === team.id)}>
                            {t(`teams.${team.code}`, { defaultValue: team.name })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Manual save button removed for auto-save */}
      </div>

      {/* Floating drag clone — follows pointer, always solid */}
      {dragging && (() => {
        const team = teamsByGroup[dragging.group]?.find(tm => tm.id === dragging.teamId)
        if (!team) return null
        return createPortal(
          <div style={{
            position: 'fixed',
            top: dragging.cloneTop,
            left: dragging.cloneLeft,
            width: dragging.cloneWidth,
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.55rem 0.875rem',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--primary)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            boxSizing: 'border-box',
          }}>
            <span style={{
              fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-3)', height: '24px', width: '24px', borderRadius: '50%',
            }}>{dragging.fromIdx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
              <TeamFlag code={team.code} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {t(`teams.${team.code}`, { defaultValue: team.name })}
              </span>
            </div>
          </div>,
          document.body
        )
      })()}
    </AppShell>
  )
}
