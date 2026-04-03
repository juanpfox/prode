import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

const GROUP_LABELS   = ['A','B','C','D','E','F','G','H','I','J','K','L']
const PODIUM_SLOTS   = ['fourth','third','runner_up','champion']
const PODIUM_LABELS  = { fourth: '4°', third: '3°', runner_up: '🥈 Sub', champion: '🏆 Campeón' }
const PODIUM_LABELS_EN = { fourth: '4th', third: '3rd', runner_up: '🥈 Runner-up', champion: '🏆 Champion' }
const POS_MEDAL      = ['🥇','🥈','🥉','4️⃣']

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragState, setDragState] = useState(null) // { group, fromIdx }

  const locked = tournament.locked_at && new Date(tournament.locked_at) <= new Date()

  useEffect(() => { loadAll() }, [tournamentId])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, code, group_name')
        .eq('competition_id', tournament.competition_id)
        .order('name')

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

  // ── Drag helpers ──────────────────────────────────────────
  function onDragStart(group, fromIdx) {
    setDragState({ group, fromIdx })
  }
  function onDragOver(group, toIdx) {
    if (!dragState || dragState.group !== group || dragState.fromIdx === toIdx) return
    setGroupRanks(prev => {
      const arr = [...prev[group]]
      const [moved] = arr.splice(dragState.fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return { ...prev, [group]: arr }
    })
    setDragState({ group, fromIdx: toIdx })
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
  }

  // ── Save ────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const rows = []
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
      // Also upsert podium teams that might not appear in group ranks (shouldn't happen but safety)
      await supabase.from('fixture_predictions')
        .upsert(rows, { onConflict: 'tournament_id,user_id,team_id' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  // ── Derived: all teams in an ordered flat array for podium pickers ──
  const allTeams = Object.values(teamsByGroup).flat()

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/torneo/${tournamentId}`)}
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
        {GROUP_LABELS.filter(g => teamsByGroup[g]?.length > 0).map(group => (
          <section key={group} style={{ marginBottom: '1.25rem' }}>
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
                return (
                  <div
                    key={teamId}
                    draggable={!locked}
                    onDragStart={() => onDragStart(group, idx)}
                    onDragOver={e => { e.preventDefault(); onDragOver(group, idx) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--surface-2)',
                      border: '1.5px solid var(--border)',
                      cursor: locked ? 'default' : 'grab',
                      userSelect: 'none',
                      transition: 'box-shadow 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '1rem', minWidth: '1.5rem' }}>{POS_MEDAL[idx]}</span>
                    <span style={{
                      fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--text-muted)', minWidth: '2rem'
                    }}>{team.code}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>{team.name}</span>
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

        {/* Podium */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.07em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem'
          }}>
            {t('posiciones.podium')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {PODIUM_SLOTS.slice().reverse().map(slot => (
              <div key={slot} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--r-md)',
                background: podium[slot] ? 'var(--primary-subtle)' : 'var(--surface-2)',
                border: podium[slot] ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, minWidth: '4.5rem', fontSize: '0.875rem',
                  color: podium[slot] ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {podiumLabels[slot]}
                </span>
                {locked ? (
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>
                    {allTeams.find(t => t.id === podium[slot])?.name ?? '—'}
                  </span>
                ) : (
                  <select
                    className="input"
                    style={{ flex: 1, fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
                    value={podium[slot] ?? ''}
                    onChange={e => setPodium(p => ({ ...p, [slot]: e.target.value || null }))}
                  >
                    <option value="">— {t('posiciones.pick_team')} —</option>
                    {allTeams.map(team => (
                      <option key={team.id} value={team.id}
                        disabled={Object.entries(podium).some(([s, id]) => s !== slot && id === team.id)}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        {!locked && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '2rem', fontSize: '1rem', padding: '0.875rem' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? `✓ ${t('predictions.saved')}` : saving ? '…' : t('predictions.save')}
          </button>
        )}
      </div>
    </AppShell>
  )
}
