import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './config-rules.css'

export default function RulesPage({ tournamentId, mode, config: propConfig }) {
  const { t } = useTranslation()
  const [config, setConfig] = useState(propConfig ?? null)

  useEffect(() => {
    if (propConfig) { setConfig(propConfig); return }
    supabase
      .from('tournament_config')
      .select('*')
      .eq('tournament_id', tournamentId)
      .single()
      .then(({ data }) => data && setConfig(data))
  }, [tournamentId, propConfig])

  if (!config) return null

  const isPartidos = mode === 'partidos'

  return (
    <div className="rules-page">
      {isPartidos ? <MatchRules config={config} t={t} /> : <PosicionesRules config={config} t={t} />}
    </div>
  )
}

function MatchRules({ config, t }) {
  const c = config

  // Rows filtered to non-zero values
  const scoringRows = [
    { label: t('rules.match_correct_winner'),  value: c.pts_win,          fmt: v => `+${v}` },
    { label: t('rules.match_draw_correct'),    value: c.pts_win,          fmt: v => `+${v}` },
    { label: t('rules.match_exact_both'),      value: c.pts_exact_both,   fmt: v => `+${v}` },
    { label: t('rules.match_exact_one'),       value: c.pts_exact_one,    fmt: v => `+${v} ${t('rules.per_team')}` },
    { label: t('rules.match_diff_correct'),    value: c.pts_diff_correct, fmt: v => `+${v} ${t('rules.per_goal')}` },
    { label: t('rules.match_diff_wrong'),      value: c.pts_diff_wrong,   fmt: v => `${v} ${t('rules.per_goal')}` },
  ].filter(r => r.value !== 0 && r.value !== null && r.value !== undefined)

  const multRows = [
    { label: t('rules.phase_r16'),   value: c.mult_r16 },
    { label: t('rules.phase_qf'),    value: c.mult_qf },
    { label: t('rules.phase_sf'),    value: c.mult_sf },
    { label: t('rules.phase_final'), value: c.mult_final },
  ].filter(r => r.value && r.value !== 1)

  return (
    <>
      {/* Points table */}
      <div className="rules-section">
        <h3>{t('rules.scoring_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>{t('rules.situation')}</th>
              <th>{t('rules.points')}</th>
            </tr>
          </thead>
          <tbody>
            {scoringRows.map((r, i) => (
              <tr key={i}><td>{r.label}</td><td>{r.fmt(r.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phase multipliers — only show if any differ from ×1 */}
      {multRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.multipliers_title')}</h3>
          <table className="rules-table">
            <thead>
              <tr>
                <th>{t('rules.phase')}</th>
                <th>{t('rules.multiplier')}</th>
              </tr>
            </thead>
            <tbody>
              {multRows.map((r, i) => (
                <tr key={i}><td>{r.label}</td><td>×{r.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Example */}
      <div className="rules-section">
        <h3>{t('rules.example_title')}</h3>
        <div className="rules-example">
          <p>
            <strong>{t('rules.example_match_label')}</strong> Argentina 2-1 Brasil ({t('rules.phase_qf')})
          </p>
          <p>
            <strong>{t('rules.example_prediction_label')}</strong> Argentina 3-1 Brasil
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            {t('rules.example_correct_winner')}: <span className="highlight">+{c.pts_win}</span><br />
            {t('rules.example_exact_one')}: <span className="highlight">+{c.pts_exact_one}</span> (Brasil: 1)<br />
            {t('rules.example_diff')}: {t('rules.example_diff_detail', { predicted: 2, actual: 1, pts: c.pts_diff_wrong })}<br />
            {t('rules.example_subtotal')}: <span className="highlight">{c.pts_win + c.pts_exact_one + c.pts_diff_wrong}</span><br />
            {t('rules.example_multiplier')}: ×{c.mult_qf}<br />
            <strong>{t('rules.example_total')}: <span className="highlight">{(c.pts_win + c.pts_exact_one + c.pts_diff_wrong) * c.mult_qf} pts</span></strong>
          </p>
        </div>
      </div>
    </>
  )
}

function PosicionesRules({ config, t }) {
  const c = config

  const groupRows = [
    { label: t('rules.pos_1st'), value: c.mult_group_1st },
    { label: t('rules.pos_2nd'), value: c.mult_group_2nd },
    { label: t('rules.pos_3rd'), value: c.mult_group_3rd },
  ].filter(r => r.value !== 0 && r.value !== null && r.value !== undefined)

  const worldRows = [
    { label: `🥇 ${t('rules.pos_champion')}`,    value: c.mult_world_1st },
    { label: `🥈 ${t('rules.pos_runner_up')}`,   value: c.mult_world_2nd },
    { label: `🥉 ${t('rules.pos_third_place')}`, value: c.mult_world_3rd },
    { label: `4° ${t('rules.pos_fourth')}`,       value: c.mult_world_4th },
  ].filter(r => r.value !== 0 && r.value !== null && r.value !== undefined)

  const matchRows = [
    { label: t('rules.pos_win'),     value: c.pts_win },
    { label: t('rules.pos_win_pen'), value: c.pts_win_pen },
    { label: t('rules.pos_draw'),    value: c.pts_draw },
  ].filter(r => r.value !== 0 && r.value !== null && r.value !== undefined)

  const bonusRows = [
    { label: t('rules.pos_exact_position'),  value: c.pts_position_exact },
    { label: t('rules.pos_semifinalist'),    value: c.pts_semifinalist },
    { label: t('rules.pos_finalist'),        value: c.pts_finalist },
    { label: t('rules.pos_champion_bonus'),  value: c.pts_champion_bonus },
  ].filter(r => r.value !== 0 && r.value !== null && r.value !== undefined)

  return (
    <>
      {groupRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.pos_group_mult_title')}</h3>
          <table className="rules-table">
            <thead><tr><th>{t('rules.position')}</th><th>{t('rules.multiplier')}</th></tr></thead>
            <tbody>
              {groupRows.map((r, i) => <tr key={i}><td>{r.label}</td><td>×{r.value}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {worldRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.pos_world_mult_title')}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {t('rules.pos_world_mult_note')}
          </p>
          <table className="rules-table">
            <thead><tr><th>{t('rules.position')}</th><th>{t('rules.multiplier')}</th></tr></thead>
            <tbody>
              {worldRows.map((r, i) => <tr key={i}><td>{r.label}</td><td>×{r.value}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {matchRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.pos_match_points_title')}</h3>
          <table className="rules-table">
            <thead><tr><th>{t('rules.result')}</th><th>{t('rules.points')}</th></tr></thead>
            <tbody>
              {matchRows.map((r, i) => <tr key={i}><td>{r.label}</td><td>+{r.value}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {bonusRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.pos_bonus_title')}</h3>
          <table className="rules-table">
            <thead><tr><th>{t('rules.achievement')}</th><th>{t('rules.points')}</th></tr></thead>
            <tbody>
              {bonusRows.map((r, i) => <tr key={i}><td>{r.label}</td><td>+{r.value}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {/* Example */}
      <div className="rules-section">
        <h3>{t('rules.example_title')}</h3>
        <div className="rules-example">
          <p>
            <strong>{t('rules.pos_example_setup')}</strong>
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            {t('rules.pos_example_detail', {
              win_pts: c.pts_win,
              mult: c.mult_world_1st,
              total_per_win: c.pts_win * c.mult_world_1st,
              champion_bonus: c.pts_champion_bonus
            })}
          </p>
        </div>
      </div>
    </>
  )
}
