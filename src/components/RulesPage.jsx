import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { SimuladorPuntosBody } from './SimuladorPuntos'
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
  const acertoGanador = c.pts_ganador ?? 1
  const acertoEmpate = c.pts_empate ?? 3
  const resultadoExacto = c.pts_resultado_exacto ?? 1
  const acertoDiferenciaExacta = c.pts_diferencia_exacta ?? 4
  const descuento = c.pts_descuento_diferencia ?? 1
  const descuentoEmpate = c.pts_descuento_empate ?? 1
  const extraGoleada = c.pts_goleada ?? 1

  const multRows = [
    { label: t('rules.phase_r16'),   value: c.mult_r16 },
    { label: t('rules.phase_qf'),    value: c.mult_qf },
    { label: t('rules.phase_sf'),    value: c.mult_sf },
    { label: t('rules.phase_final'), value: c.mult_final },
  ].filter(r => r.value && r.value !== 1)

  return (
    <>
      <div className="rules-section">
        <h3>{t('rules.scoring_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr><th>{t('rules.situation')}</th><th>{t('rules.points')}</th></tr>
          </thead>
          <tbody>
            <tr><td>{t('rules.match_draw_correct')}</td><td>+{acertoEmpate}</td></tr>
            <tr><td>{t('rules.match_draw_wrong')}</td><td>0</td></tr>
            <tr><td>{t('rules.match_correct_winner')}</td><td>+{acertoGanador} + {t('rules.bono_diferencia').toLowerCase()}</td></tr>
            <tr><td>{t('rules.match_wrong_winner')}</td><td>{t('rules.penalizacion_diferencia').toLowerCase()}</td></tr>
            {resultadoExacto > 0 && <tr><td>{t('rules.resultado_exacto')}</td><td>+{resultadoExacto}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rules-section">
        <h3>{t('rules.match_params_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr><th>{t('rules.situation')}</th><th>{t('rules.points')}</th></tr>
          </thead>
          <tbody>
            <tr><td>{t('config.pts_ganador')}</td><td>{acertoGanador}</td></tr>
            <tr><td>{t('config.pts_empate')}</td><td>{acertoEmpate}</td></tr>
            <tr><td>{t('config.pts_resultado_exacto')}</td><td>{resultadoExacto}</td></tr>
            <tr><td>{t('config.pts_diferencia_exacta')}</td><td>{acertoDiferenciaExacta}</td></tr>
            <tr><td>{t('config.pts_descuento_diferencia')}</td><td>{descuento}</td></tr>
            <tr><td>{t('config.pts_descuento_empate')}</td><td>{descuentoEmpate}</td></tr>
            <tr><td>{t('config.pts_goleada')}</td><td>{extraGoleada}</td></tr>
          </tbody>
        </table>
      </div>

      {multRows.length > 0 && (
        <div className="rules-section">
          <h3>{t('rules.multipliers_title')}</h3>
          <table className="rules-table">
            <thead>
              <tr><th>{t('rules.phase')}</th><th>{t('rules.multiplier')}</th></tr>
            </thead>
            <tbody>
              {multRows.map((r, i) => (
                <tr key={i}><td>{r.label}</td><td>×{r.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rules-section">
        <h3>{t('rules.example_title')}</h3>
        <SimuladorPuntosBody config={c} t={t} />
      </div>
    </>
  )
}

function PosicionesRules({ config, t }) {
  const c = config
  const isNonZero = v => v !== 0 && v !== null && v !== undefined

  const groupRows = [
    { label: t('rules.pos_1st'), value: c.mult_group_1st },
    { label: t('rules.pos_2nd'), value: c.mult_group_2nd },
    { label: t('rules.pos_3rd'), value: c.mult_group_3rd },
  ].filter(r => isNonZero(r.value))

  const worldRows = [
    { label: `🥇 ${t('rules.pos_champion')}`,    value: c.mult_world_1st },
    { label: `🥈 ${t('rules.pos_runner_up')}`,   value: c.mult_world_2nd },
    { label: `🥉 ${t('rules.pos_third_place')}`, value: c.mult_world_3rd },
    { label: `4° ${t('rules.pos_fourth')}`,       value: c.mult_world_4th },
  ].filter(r => isNonZero(r.value))

  const matchRows = [
    { label: t('rules.pos_win'),     value: c.pts_win },
    { label: t('rules.pos_win_pen'), value: c.pts_win_pen },
    { label: t('rules.pos_draw'),    value: c.pts_draw },
  ].filter(r => isNonZero(r.value))

  const bonusRows = [
    { label: t('rules.pos_exact_position'),  value: c.pts_position_exact },
    { label: t('rules.pos_semifinalist'),    value: c.pts_semifinalist },
    { label: t('rules.pos_finalist'),        value: c.pts_finalist },
    { label: t('rules.pos_champion_bonus'),  value: c.pts_champion_bonus },
  ].filter(r => isNonZero(r.value))

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
            <strong>{t('rules.pos_example_setup', { mult_world_1st: c.mult_world_1st })}</strong>
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
