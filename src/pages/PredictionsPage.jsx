import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

const STAGE_ORDER = ['group', 'r16', 'qf', 'sf', 'third_place', 'final']
const STAGE_LABEL = {
  group:       { es: 'Fase de grupos',  en: 'Group stage' },
  r16:         { es: 'Octavos',         en: 'Round of 16' },
  qf:          { es: 'Cuartos',         en: 'Quarter-finals' },
  sf:          { es: 'Semifinales',     en: 'Semi-finals' },
  third_place: { es: 'Tercer puesto',   en: 'Third place' },
  final:       { es: 'Final',           en: 'Final' },
}

export default function PredictionsPage() {
  const { t, i18n } = useTranslation()
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({}) // match_id -> { home_goals, away_goals, pen_pick }
  const [saving, setSaving] = useState({})           // match_id -> bool
  const [saved, setSaved]   = useState({})           // match_id -> bool
  const [loading, setLoading] = useState(true)
  const [myStatus, setMyStatus] = useState(null)

  useEffect(() => { loadAll() }, [tournamentId, user])

  async function loadAll() {
    setLoading(true)
    try {
      // Tournament info
      const { data: tr } = await supabase
        .from('tournaments')
        .select('*, competitions(name, type, available_modes)')
        .eq('id', tournamentId).single()
      setTournament(tr)

      // My membership
      const { data: tp } = await supabase
        .from('tournament_players')
        .select('status, role')
        .eq('tournament_id', tournamentId).eq('user_id', user.id).single()
      setMyStatus(tp?.status ?? null)

      // Matches for this competition
      const { data: ms } = await supabase
        .from('matches')
        .select('*, home_team:teams!home_team_id(name, code), away_team:teams!away_team_id(name, code)')
        .eq('competition_id', tr?.competition_id)
        .order('kickoff_at')
      setMatches(ms ?? [])

      // My existing predictions
      const { data: preds } = await supabase
        .from('match_predictions')
        .select('match_id, home_goals, away_goals, pen_pick')
        .eq('tournament_id', tournamentId).eq('user_id', user.id)

      const predMap = {}
      for (const p of preds ?? []) {
        predMap[p.match_id] = { home_goals: p.home_goals ?? '', away_goals: p.away_goals ?? '', pen_pick: p.pen_pick ?? '' }
      }
      setPredictions(predMap)
    } finally {
      setLoading(false)
    }
  }

  function isLocked(match) {
    return new Date(match.kickoff_at) <= new Date(Date.now() + 60 * 60 * 1000)
  }

  function updatePred(matchId, field, value) {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? {}), [field]: value }
    }))
  }

  async function savePred(match) {
    const pred = predictions[match.id] ?? {}
    const home = pred.home_goals !== '' && pred.home_goals !== undefined ? parseInt(pred.home_goals) : 0
    const away = pred.away_goals !== '' && pred.away_goals !== undefined ? parseInt(pred.away_goals) : 0

    setSaving(s => ({ ...s, [match.id]: true }))
    try {
      const payload = {
        tournament_id: tournamentId,
        user_id: user.id,
        match_id: match.id,
        home_goals: home,
        away_goals: away,
        pen_pick: pred.pen_pick || null,
      }
      await supabase.from('match_predictions')
        .upsert(payload, { onConflict: 'tournament_id,user_id,match_id' })
      setPredictions(prev => ({ ...prev, [match.id]: { home_goals: String(home), away_goals: String(away), pen_pick: pred.pen_pick || '' } }))
      setSaved(s => ({ ...s, [match.id]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [match.id]: false })), 2000)
    } finally {
      setSaving(s => ({ ...s, [match.id]: false }))
    }
  }

  // Group matches by stage
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

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/torneo/${tournamentId}`)}
          style={{ marginBottom: '1rem' }}>
          ← {tournament?.name}
        </button>

        <h2 className="home-section-title" style={{ marginBottom: '0.25rem' }}>
          {t('predictions.title')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          {t('predictions.lock_info')}
        </p>

        {STAGE_ORDER.filter(s => byStage[s]?.length).map(stage => (
          <section key={stage} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {STAGE_LABEL[stage]?.[lang] ?? stage}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {byStage[stage].map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pred={predictions[match.id] ?? {}}
                  locked={isLocked(match)}
                  saving={saving[match.id]}
                  saved={saved[match.id]}
                  onChange={(field, val) => updatePred(match.id, field, val)}
                  onSave={() => savePred(match)}
                  t={t}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}

function MatchCard({ match, pred, locked, saving, saved, onChange, onSave, t }) {
  const home = match.home_team?.name ?? '?'
  const away = match.away_team?.name ?? '?'
  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    + ' ' + kickoff.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const hasResult = match.home_goals !== null
  const isElim = ['r16','qf','sf','third_place','final'].includes(match.stage)
  const showPens = isElim && !locked
    && pred.home_goals !== '' && pred.away_goals !== ''
    && parseInt(pred.home_goals) === parseInt(pred.away_goals)

  const predFilled = (pred.home_goals !== '' && pred.home_goals !== undefined) || (pred.away_goals !== '' && pred.away_goals !== undefined)

  return (
    <div className="card card-sm" style={{
      opacity: locked && !predFilled ? 0.65 : 1,
      borderColor: saved ? 'var(--primary)' : undefined,
    }}>
      {/* Teams + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.625rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{kickoffStr}</span>
        {locked && (
          <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>
            🔒 {hasResult ? t('predictions.finished') : t('predictions.locked')}
          </span>
        )}
      </div>

      {/* Score row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem' }}>
        {/* Home */}
        <span style={{ fontWeight: 700, fontSize: '0.9rem', textAlign: 'right' }}>{home}</span>

        {/* Score inputs or result */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {hasResult ? (
            // Real result
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ResultBubble val={match.home_goals} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
              <ResultBubble val={match.away_goals} />
            </div>
          ) : locked ? (
            // Locked, show prediction read-only
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ResultBubble val={pred.home_goals !== '' ? pred.home_goals : '?'} muted={pred.home_goals === ''} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
              <ResultBubble val={pred.away_goals !== '' ? pred.away_goals : '?'} muted={pred.away_goals === ''} />
            </div>
          ) : (
            // Editable inputs
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <GoalInput val={pred.home_goals ?? ''} onChange={v => onChange('home_goals', v)} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>vs</span>
              <GoalInput val={pred.away_goals ?? ''} onChange={v => onChange('away_goals', v)} />
            </div>
          )}
        </div>

        {/* Away */}
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{away}</span>
      </div>

      {/* Penalty pick (eliminatoria, empate pronosticado) */}
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

      {/* Prediction vs result comparison */}
      {hasResult && predFilled && (
        <PredResult match={match} pred={pred} t={t} />
      )}

      {/* Save button */}
      {!locked && predFilled && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.625rem', width: '100%' }}
          onClick={onSave}
          disabled={saving}>
          {saved ? `✓ ${t('predictions.saved')}` : saving ? '…' : t('predictions.save')}
        </button>
      )}
    </div>
  )
}

function GoalInput({ val, onChange }) {
  const num = val === '' ? null : parseInt(val)
  const inc = () => onChange(String(num === null ? 1 : Math.min(20, num + 1)))
  const dec = () => { if (num !== null && num > 0) onChange(String(num - 1)) }

  const btnStyle = {
    width: '100%', padding: '0.2rem 0', fontSize: '1rem', fontWeight: 700,
    color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
    lineHeight: 1,
  }
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: '2.75rem', border: '1.5px solid var(--border)',
      borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-2)',
    }}>
      <button style={btnStyle} onClick={inc}>+</button>
      <div style={{
        width: '100%', textAlign: 'center', padding: '0.2rem 0',
        fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)',
        background: 'var(--surface-3)', borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', minHeight: '1.6rem',
        lineHeight: '1.6rem',
      }}>
        {num !== null ? num : ''}
      </div>
      <button style={btnStyle} onClick={dec}>−</button>
    </div>
  )
}

function ResultBubble({ val, muted }) {
  return (
    <span style={{
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
  const realWinner = match.winner // 'home' | 'away' | 'draw'
  const correctWinner = predWinner === realWinner

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.625rem',
        background: exactBoth ? 'var(--primary-subtle)' : correctWinner ? 'var(--surface-2)' : 'var(--surface-2)',
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
