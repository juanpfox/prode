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
            <tr><td>{t('rules.match_correct_winner')}</td><td>+{c.pts_win}</td></tr>
            <tr><td>{t('rules.match_draw_correct')}</td><td>+{c.pts_win}</td></tr>
            <tr><td>{t('rules.match_draw_wrong')}</td><td>0</td></tr>
            <tr><td>{t('rules.match_wrong_winner')}</td><td>0</td></tr>
            <tr><td>{t('rules.match_exact_both')}</td><td>+{c.pts_exact_both}</td></tr>
            <tr><td>{t('rules.match_exact_one')}</td><td>+{c.pts_exact_one} {t('rules.per_team')}</td></tr>
            <tr><td>{t('rules.match_diff_correct')}</td><td>+{c.pts_diff_correct} {t('rules.per_goal')}</td></tr>
            <tr><td>{t('rules.match_diff_wrong')}</td><td>{c.pts_diff_wrong} {t('rules.per_goal')}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Phase multipliers */}
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
            <tr><td>{t('rules.phase_group')}</td><td>×1</td></tr>
            <tr><td>{t('rules.phase_r16')}</td><td>×{c.mult_r16}</td></tr>
            <tr><td>{t('rules.phase_qf')}</td><td>×{c.mult_qf}</td></tr>
            <tr><td>{t('rules.phase_sf')}</td><td>×{c.mult_sf}</td></tr>
            <tr><td>{t('rules.phase_final')}</td><td>×{c.mult_final}</td></tr>
            <tr><td>{t('rules.phase_third')}</td><td>×1</td></tr>
          </tbody>
        </table>
      </div>

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
  return (
    <>
      {/* Group multipliers */}
      <div className="rules-section">
        <h3>{t('rules.pos_group_mult_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>{t('rules.position')}</th>
              <th>{t('rules.multiplier')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t('rules.pos_1st')}</td><td>×{c.mult_group_1st}</td></tr>
            <tr><td>{t('rules.pos_2nd')}</td><td>×{c.mult_group_2nd}</td></tr>
            <tr><td>{t('rules.pos_3rd')}</td><td>×{c.mult_group_3rd}</td></tr>
          </tbody>
        </table>
      </div>

      {/* World multipliers */}
      <div className="rules-section">
        <h3>{t('rules.pos_world_mult_title')}</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {t('rules.pos_world_mult_note')}
        </p>
        <table className="rules-table">
          <thead>
            <tr>
              <th>{t('rules.position')}</th>
              <th>{t('rules.multiplier')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🥇 {t('rules.pos_champion')}</td><td>×{c.mult_world_1st}</td></tr>
            <tr><td>🥈 {t('rules.pos_runner_up')}</td><td>×{c.mult_world_2nd}</td></tr>
            <tr><td>🥉 {t('rules.pos_third_place')}</td><td>×{c.mult_world_3rd}</td></tr>
            <tr><td>4° {t('rules.pos_fourth')}</td><td>×{c.mult_world_4th}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Match points within posiciones mode */}
      <div className="rules-section">
        <h3>{t('rules.pos_match_points_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>{t('rules.result')}</th>
              <th>{t('rules.points')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t('rules.pos_win')}</td><td>+{c.pts_win}</td></tr>
            <tr><td>{t('rules.pos_win_pen')}</td><td>+{c.pts_win_pen}</td></tr>
            <tr><td>{t('rules.pos_draw')}</td><td>+{c.pts_draw}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Bonus points */}
      <div className="rules-section">
        <h3>{t('rules.pos_bonus_title')}</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>{t('rules.achievement')}</th>
              <th>{t('rules.points')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{t('rules.pos_exact_position')}</td><td>+{c.pts_position_exact}</td></tr>
            <tr><td>{t('rules.pos_semifinalist')}</td><td>+{c.pts_semifinalist}</td></tr>
            <tr><td>{t('rules.pos_finalist')}</td><td>+{c.pts_finalist}</td></tr>
            <tr><td>{t('rules.pos_champion_bonus')}</td><td>+{c.pts_champion_bonus}</td></tr>
          </tbody>
        </table>
      </div>

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
