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

export default function ConfigTab({ 
  tournamentId, 
  isAdmin, 
  mode, 
  externalConfig = null, 
  onExternalChange = null 
}) {
  const { t } = useTranslation()
  const [config, setConfig] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [openSections, setOpenSections] = useState({})
  const pendingChanges = useRef({})
  const timeoutRef = useRef(null)

  // Determine if we are in "Create mode" (external) or "Edit mode" (internal/DB)
  const isExternal = !!externalConfig
  const effectiveConfig = isExternal ? externalConfig : config

  useEffect(() => {
    if (isExternal || !tournamentId) return
    supabase
      .from('tournament_config')
      .select('*')
      .eq('tournament_id', tournamentId)
      .single()
      .then(({ data }) => {
        if (data) setConfig({ ...data })
      })
  }, [tournamentId, isExternal])

  // Clear timeout on unmount
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  if (!effectiveConfig) return null

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function updateField(key, rawValue) {
    const parsed = rawValue === '' ? 0 : parseInt(rawValue) || 0
    
    if (isExternal) {
      if (onExternalChange) onExternalChange(key, parsed)
    } else {
      setConfig(prev => {
        const next = { ...prev, [key]: parsed }
        pendingChanges.current[key] = parsed
        return next
      })
      scheduleSave()
    }
  }

  function scheduleSave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(() => { savePendingChanges() }, 1500)
  }

  async function savePendingChanges() {
    const changes = { ...pendingChanges.current }
    if (Object.keys(changes).length === 0) {
      setSaveStatus(null)
      return
    }
    pendingChanges.current = {}

    const { error } = await supabase
      .from('tournament_config')
      .update(changes)
      .eq('tournament_id', tournamentId)

    if (error) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? null : prev), 3000)
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
                  <div className="config-stepper">
                    <button
                      className="config-stepper-btn"
                      tabIndex={-1}
                      onClick={() => updateField(f.key, String(Math.max(f.min ?? -10, (effectiveConfig[f.key] ?? 0) - 1)))}
                    >−</button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="config-stepper-val"
                      value={effectiveConfig[f.key] ?? ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9\-]/g, '')
                        updateField(f.key, raw)
                      }}
                      onBlur={e => {
                        const n = parseInt(e.target.value) || 0
                        const clamped = Math.max(f.min ?? -10, n)
                        updateField(f.key, String(clamped))
                      }}
                      onFocus={e => e.target.select()}
                    />
                    <button
                      className="config-stepper-btn"
                      tabIndex={-1}
                      onClick={() => updateField(f.key, String(Math.min(99, (effectiveConfig[f.key] ?? 0) + 1)))}
                    >+</button>
                  </div>
                ) : (
                  <span className="config-readonly-value">{effectiveConfig[f.key]}</span>
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
    <div className="config-tab" style={{ padding: isExternal ? 0 : undefined }}>
      {!isAdmin && !isExternal && (
        <div className="config-readonly-banner">
          🔒 {t('config.readonly')}
        </div>
      )}

      {isAdmin && !isExternal && saveStatus && (
        <div className={`config-autosave-bar config-autosave-${saveStatus}`}>
          {saveStatus === 'saving' && (
            <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> {t('common.loading')}</>
          )}
          {saveStatus === 'saved' && <>✓ {t('config.save_ok') || 'Guardado'}</>}
          {saveStatus === 'error' && <>{t('common.error_generic')}</>}
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
    </div>
  )
}
