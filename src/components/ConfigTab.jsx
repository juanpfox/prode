import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './config-rules.css'

const MATCH_FIELDS = [
  { key: 'pts_win',          label: 'config.pts_win',          min: 0 },
  { key: 'pts_draw',         label: 'config.pts_draw',         min: 0 },
  { key: 'pts_exact_both',   label: 'config.pts_exact_both',   min: 0 },
  { key: 'pts_exact_one',    label: 'config.pts_exact_one',    min: 0 },
  { key: 'pts_diff_correct', label: 'config.pts_diff_correct', min: -10 },
  { key: 'pts_diff_wrong',   label: 'config.pts_diff_wrong',   min: -10 },
]

const MATCH_MULT_FIELDS = [
  { key: 'mult_r16',   label: 'config.mult_r16' },
  { key: 'mult_qf',    label: 'config.mult_qf' },
  { key: 'mult_sf',    label: 'config.mult_sf' },
  { key: 'mult_final', label: 'config.mult_final' },
]

const POS_FIELDS = [
  { key: 'pts_position_exact',  label: 'config.pts_position_exact',  min: 0 },
  { key: 'pts_semifinalist',    label: 'config.pts_semifinalist',    min: 0 },
  { key: 'pts_finalist',        label: 'config.pts_finalist',        min: 0 },
  { key: 'pts_champion_bonus',  label: 'config.pts_champion_bonus',  min: 0 },
  { key: 'pts_win',             label: 'config.pts_win_pos',         min: 0 },
  { key: 'pts_win_pen',         label: 'config.pts_win_pen',         min: 0 },
  { key: 'pts_draw',            label: 'config.pts_draw',            min: 0 },
]

const POS_MULT_GROUP = [
  { key: 'mult_group_1st', label: 'config.mult_group_1st' },
  { key: 'mult_group_2nd', label: 'config.mult_group_2nd' },
  { key: 'mult_group_3rd', label: 'config.mult_group_3rd' },
]

const POS_MULT_WORLD = [
  { key: 'mult_world_1st', label: 'config.mult_world_1st' },
  { key: 'mult_world_2nd', label: 'config.mult_world_2nd' },
  { key: 'mult_world_3rd', label: 'config.mult_world_3rd' },
  { key: 'mult_world_4th', label: 'config.mult_world_4th' },
]

export default function ConfigTab({ tournamentId, isAdmin, mode }) {
  const { t } = useTranslation()
  const [config, setConfig] = useState(null)
  const [original, setOriginal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [openSections, setOpenSections] = useState({})

  useEffect(() => {
    supabase
      .from('tournament_config')
      .select('*')
      .eq('tournament_id', tournamentId)
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({ ...data })
          setOriginal({ ...data })
        }
      })
  }, [tournamentId])

  if (!config) return null

  const hasChanges = original && JSON.stringify(config) !== JSON.stringify(original)

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function updateField(key, value) {
    setConfig(prev => ({ ...prev, [key]: value === '' ? '' : parseInt(value) || 0 }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    const { id, tournament_id, created_at, ...updates } = config
    const { error } = await supabase
      .from('tournament_config')
      .update(updates)
      .eq('tournament_id', tournamentId)
    setSaving(false)
    if (error) {
      setSaveMsg(t('common.error_generic'))
    } else {
      setOriginal({ ...config })
      setSaveMsg('✓')
      setTimeout(() => setSaveMsg(''), 2000)
    }
  }

  function renderSection(title, sectionKey, fields) {
    const isOpen = openSections[sectionKey] !== false // open by default
    return (
      <div className="config-section" key={sectionKey}>
        <div className="config-section-header" onClick={() => toggleSection(sectionKey)}>
          <span>{title}</span>
          <span className={`chevron ${isOpen ? 'open' : ''}`}>▼</span>
        </div>
        {isOpen && (
          <div className="config-section-body">
            {fields.map(f => (
              <div className="config-row" key={f.key}>
                <label>{t(f.label)}</label>
                {isAdmin ? (
                  <input
                    type="number"
                    value={config[f.key] ?? ''}
                    onChange={e => updateField(f.key, e.target.value)}
                    min={f.min ?? 1}
                  />
                ) : (
                  <span className="config-readonly-value">{config[f.key]}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isPartidos = mode === 'partidos'
  const isPosiciones = mode === 'posiciones'

  return (
    <div className="config-tab">
      {!isAdmin && (
        <div className="config-readonly-banner">
          🔒 {t('config.readonly')}
        </div>
      )}

      {isPartidos && (
        <>
          {renderSection(t('config.section_points'), 'match_pts', MATCH_FIELDS)}
          {renderSection(t('config.section_multipliers'), 'match_mult', MATCH_MULT_FIELDS)}
        </>
      )}

      {isPosiciones && (
        <>
          {renderSection(t('config.section_points'), 'pos_pts', POS_FIELDS)}
          {renderSection(t('config.section_mult_group'), 'pos_mult_group', POS_MULT_GROUP)}
          {renderSection(t('config.section_mult_world'), 'pos_mult_world', POS_MULT_WORLD)}
        </>
      )}

      {isAdmin && hasChanges && (
        <div className="config-save-bar">
          {saveMsg && <span className="config-save-msg">{saveMsg}</span>}
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('config.save')}
          </button>
        </div>
      )}
    </div>
  )
}
