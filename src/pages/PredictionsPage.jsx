import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

const STAGE_LABELS = {
  group:       { es: 'Fase de grupos', en: 'Group stage' },
  r16:         { es: 'Octavos',        en: 'Round of 16' },
  qf:          { es: 'Cuartos',        en: 'Quarter-finals' },
  sf:          { es: 'Semis',          en: 'Semi-finals' },
  third_place: { es: 'Tercer puesto',  en: '3rd place' },
  final:       { es: 'Final',          en: 'Final' },
}

function isLocked(kickoff_at) {
  return new Date(kickoff_at) - Date.now() < 60 * 60 * 1000
}

function timeUntil(kickoff_at, lang) {
  const diff = new Date(kickoff_at) - Date.now()
  if (diff < 0) return lang === 'es' ? 'Jugado' : 'Played'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) {
    const d = Math.floor(h / 24)
    return lang === 'es' ? `en ${d}d` : `in ${d}d`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function PredictionsPage() {
  const { t, i18n } = useTranslation()
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [tournament, setTournament] = useState(null)
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({}) // match_id -> {home, away, pen}
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)
  const [myStatus, setMyStatus] = useState(null)

  useEffect(() => { loadAll() }, [tournamentId])

  async function loadAll() {
    setLoading(true)
    try {
      // Tournament + my membership
      const [{ data: tr }, { data: tp }, { data: ms }, { data: preds }] = await Promise.all([
        supabase.from('tournaments')
          .select('*, competitions(name, type, available_modes)')
          .eq('id', tournamentId).single(),
        supabase.from('tournament_players')
          .select('role, status')
          .eq('tournament_id', tournamentId).eq('user_id', user.id).single(),
        supabase.from('matches')
          .select('*, home:home_team_id(id,name,code), away:away_team_id(id,name,code)')
          .eq('competition_id', supabase.rpc) // will be set below
          .order('kickoff_at'),
        supabase.from('match_predictions')
          .select('match_id, home_goals, away_goals, pen_pick')
          .eq('tournament_id', tournamentId).eq('user_id', user.id),
      ])

      setTournament(tr)
      setMyStatus(tp?.status ?? null)

      // Load matches for the competition of this tournament
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home:home_team_id(id,name,code), away:away_team_id(id,name,code)')
        .eq('competition_id', tr.competition_id)
        .order('kickoff_at')
      setMatches(matchData ?? [])

      // Build predictions map
      const map = {}
      for (const p of (preds ?? [])) {
        map[p.match_id] = { home: p.home_goals, away: p.away_goals, pen: p.pen_pick }
      }
      setPredictions(map)
    } finally {
      setLoading(false)
    }
  }

  async function savePrediction(matchId) {
    const pred = predictions[matchId]
    if (pred?.home === undefined || pred?.away === undefined) return
    if (pred.home === '' || pred.away === '') return

    setSaving(s => ({ ...s, [matchId]: true }))
    try {
      const row = {
        tournament_id: tournamentId,
        user_id: user.id,
        match_id: matchId,
        home_goals: parseInt(pred.home),
        away_goals: parseInt(pred.away),
        pen_pick: pred.pen ?? null,
      }
      const { error } = await supabase.from('match_predictions').upsert(row,
        { onConflict: 'tournament_id,user_id,match_id' })
      if (!error) {
        setSaved(s => ({ ...s, [matchId]: true }))
        setTimeout(() => setSaved(s => ({ ...s, [matchId]: false })), 2000)
      }
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }))
    }
  }

  function updatePred(matchId, field, value) {
    setPredictions(p => ({ ...p, [matchId]: { ...(p[matchId] ?? {}), [field]: value } }))
  }

  // Group matches by stage
  const grouped = matches.reduce((acc, m) => {
    const s = m.stage
    if (!acc[s]) acc[s] = []
    acc[s].push(m)
    return acc
  }, {})
  const stageOrder = ['group', 'r16', 'qf', 'sf', 'third_place', 'final']

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  if (myStatus !== 'approved') return (
    <AppShell>
      <div className="home-empty card card-sm" style={{ marginTop: '2rem' }}>
        <span style={{ fontSize: '2rem' }}>🔒</span>
        <p style={{ color: 'var(--text-muted)' }}>{t('predictions.not_member')}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← {t('common.back')}</button>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="animate-fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/torneo/${tournamentId}`)}
          style={{ marginBottom: '0.75rem' }}>
          ← {tournament?.name}
        </button>
        <h2 className="home-section-title" style={{ marginBottom: '0.25rem' }}>
          {t('predictions.title')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          {tournament?.competitions?.name}
        </p>

        {stageOrder.filter(s => grouped[s]).map(stage => (
          <div key={stage} style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {STAGE_LABELS[stage]?.[lang] ?? stage}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {grouped[stage].map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pred={predictions[match.id]}
                  saving={saving[match.id]}
                  saved={saved[match.id]}
                  lang={lang}
                  t={t}
                  onUpdate={(field, val) => updatePred(match.id, field, val)}
                  onSave={() => savePrediction(match.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {matches.length === 0 && (
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>📅</span>
            <p style={{ color: 'var(--text-muted)' }}>{t('predictions.no_matches')}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function MatchCard({ match, pred, saving, saved, lang, t, onUpdate, onSave }) {
  const locked = isLocked(match.kickoff_at)
  const played = new Date(match.kickoff_at) < Date.now()
  const hasResult = match.home_goals !== null && match.away_goals !== null

  const homeGoals = pred?.home ?? ''
  const awayGoals = pred?.away ?? ''
  const isDraw = homeGoals !== '' && awayGoals !== '' &&
    parseInt(homeGoals) === parseInt(awayGoals)
  const isKnockout = ['r16','qf','sf','third_place','final'].includes(match.stage)
  const showPens = isKnockout && isDraw && !locked

  const canSave = homeGoals !== '' && awayGoals !== '' && !locked

  return (
    <div className="card card-sm" style={{
      opacity: locked && !hasResult ? 0.75 : 1,
      border: saved ? '1px solid var(--primary)' : undefined,
      transition: 'border var(--t-fast)',
    }}>
      {/* Kickoff info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.625rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {new Date(match.kickoff_at).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-GB',
            { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600,
            color: locked ? 'var(--text-subtle)' : 'var(--primary)' }}>
          {locked
            ? (hasResult ? `${match.home_goals}-${match.away_goals}` : '🔒')
            : timeUntil(match.kickoff_at, lang)}
        </span>
      </div>

      {/* Teams + inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem' }}>
        {/* Home */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>{match.home?.name}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{match.home?.code}</p>
        </div>

        {/* Score inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <GoalInput value={homeGoals} locked={locked}
            onChange={v => onUpdate('home', v)} />
          <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1rem' }}>-</span>
          <GoalInput value={awayGoals} locked={locked}
            onChange={v => onUpdate('away', v)} />
        </div>

        {/* Away */}
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.2 }}>{match.away?.name}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{match.away?.code}</p>
        </div>
      </div>

      {/* Penalty winner (knockout draw) */}
      {showPens && (
        <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('predictions.pen_winner')}:
          </span>
          <button
            className={`btn btn-sm ${pred?.pen === 'home' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onUpdate('pen', pred?.pen === 'home' ? null : 'home')}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.625rem' }}>
            {match.home?.code}
          </button>
          <button
            className={`btn btn-sm ${pred?.pen === 'away' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onUpdate('pen', pred?.pen === 'away' ? null : 'away')}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.625rem' }}>
            {match.away?.code}
          </button>
        </div>
      )}

      {/* Save button */}
      {!locked && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: '0.75rem', width: '100%' }}
          onClick={onSave}
          disabled={!canSave || saving}>
          {saved ? `✓ ${t('predictions.saved')}` :
           saving ? t('common.loading') :
           t('predictions.save')}
        </button>
      )}

      {/* Locked state: show user's prediction */}
      {locked && (homeGoals !== '' || awayGoals !== '') && (
        <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem',
            color: 'var(--text-muted)' }}>
          {t('predictions.your_pick')}: {homeGoals}-{awayGoals}
          {pred?.pen ? ` (${pred.pen === 'home' ? match.home?.code : match.away?.code} ${t('predictions.pen')})` : ''}
        </div>
      )}
    </div>
  )
}

function GoalInput({ value, locked, onChange }) {
  if (locked) {
    return (
      <div style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
          fontWeight: 800, fontSize: '1.125rem', color: value !== '' ? 'var(--text)' : 'var(--text-subtle)' }}>
        {value !== '' ? value : '-'}
      </div>
    )
  }
  return (
    <input
      type="number" min="0" max="20"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '2.25rem', height: '2.25rem', textAlign: 'center',
        background: 'var(--surface-2)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-md)', fontWeight: 800, fontSize: '1.125rem',
        color: 'var(--text)', outline: 'none', padding: 0,
        MozAppearance: 'textfield' }}
    />
  )
}
