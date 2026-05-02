import { useState } from 'react'

export function GoalStep({ value, onChange }) {
  return (
    <div className="config-stepper">
      <button type="button" className="config-stepper-btn" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span className="config-stepper-val">{value}</span>
      <button type="button" className="config-stepper-btn" onClick={() => onChange(Math.min(20, value + 1))}>+</button>
    </div>
  )
}

export function SimRow({ label, value, positive, negative, isTotal }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isTotal ? '0.9rem' : '0.8125rem' }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span style={{
        fontWeight: isTotal ? 800 : 700,
        color: positive ? 'var(--primary)' : negative ? 'var(--danger)' : 'var(--text)',
      }}>{value}</span>
    </div>
  )
}

export function SimuladorPuntosBody({ config, t }) {
  const [simP, setSimP] = useState({ home: 2, away: 0 })
  const [simR, setSimR] = useState({ home: 3, away: 0 })
  const [stage, setStage] = useState('group')

  const stageMultMap = {
    group: 1, r32: 1,
    r16: config?.mult_r16 ?? 2,
    qf:  config?.mult_qf  ?? 3,
    sf:  config?.mult_sf  ?? 4,
    third_place: 1,
    final: config?.mult_final ?? 6,
  }
  const mult = stageMultMap[stage] ?? 1

  const pHome = simP.home, pAway = simP.away
  const rHome = simR.home, rAway = simR.away
  const exactResult = pHome === rHome && pAway === rAway
  const bonusExacto = exactResult ? (config?.pts_resultado_exacto ?? 1) : 0
  const difP = pHome - pAway
  const difR = rHome - rAway
  const acertoGanador          = config?.pts_ganador              ?? 1
  const acertoEmpate           = config?.pts_empate               ?? 3
  const acertoDiferenciaExacta = config?.pts_diferencia_exacta    ?? 4
  const descuento              = config?.pts_descuento_diferencia ?? 1
  const extraGoleada           = config?.pts_goleada              ?? 1
  const minAbsGoles = extraGoleada * Math.min(Math.abs(difP), Math.abs(difR))

  let subtotal, caseType = 'miss_empate', ptsGanador = 0, bonoDif = 0, penalizacion = 0
  if (difP === 0 && difR === 0) {
    subtotal = acertoEmpate; caseType = 'empate'
  } else if (difP === 0 || difR === 0) {
    subtotal = 0; caseType = 'miss_empate'
  } else if (Math.sign(difP) === Math.sign(difR)) {
    bonoDif = Math.max(0, acertoDiferenciaExacta - acertoGanador - descuento * Math.abs(difP - difR) + minAbsGoles)
    ptsGanador = acertoGanador
    subtotal = ptsGanador + bonoDif; caseType = 'ganador_ok'
  } else {
    subtotal = Math.min(0, -descuento * Math.abs(difP - difR) + acertoGanador)
    penalizacion = subtotal; caseType = 'ganador_mal'
  }
  subtotal += bonusExacto
  const total = subtotal * mult

  const stages = [
    { key: 'group', label: t('rules.phase_group') },
    { key: 'r16',   label: t('rules.phase_r16') },
    { key: 'qf',    label: t('rules.phase_qf') },
    { key: 'sf',    label: t('rules.phase_sf') },
    { key: 'final', label: t('rules.phase_final') },
  ]

  const cardStyle = {
    flex: 1, minWidth: '160px',
    background: 'var(--surface-3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '0.625rem 0.75rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Phase selector */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {stages.map(s => (
          <button key={s.key} type="button" onClick={() => setStage(s.key)} style={{
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--r-sm)',
            border: '1.5px solid',
            borderColor: stage === s.key ? 'var(--primary)' : 'var(--border)',
            background: stage === s.key ? 'var(--primary)' : 'transparent',
            color: stage === s.key ? 'var(--primary-fg)' : 'var(--text-muted)',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', lineHeight: 1.5,
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Match cards */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        {[
          { label: t('config.simulator_pred'), goals: simP, setGoals: setSimP },
          { label: t('config.simulator_real'), goals: simR, setGoals: setSimR },
        ].map(({ label, goals, setGoals }) => (
          <div key={label} style={cardStyle}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ flex: 1, textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Argentina</span>
              <GoalStep value={goals.home} onChange={v => setGoals(g => ({ ...g, home: v }))} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>-</span>
              <GoalStep value={goals.away} onChange={v => setGoals(g => ({ ...g, away: v }))} />
              <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Brasil</span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {caseType === 'empate'     && <SimRow label={t('rules.match_draw_correct')}    value={`+${acertoEmpate}`} positive />}
        {caseType === 'miss_empate' && <SimRow label={t('rules.match_draw_wrong')}      value="0" />}
        {caseType === 'ganador_ok' && (
          <>
            <SimRow label={t('rules.example_correct_winner')} value={`+${ptsGanador}`} positive />
            {bonoDif > 0 && <SimRow label={t('rules.bono_diferencia')} value={`+${bonoDif}`} positive />}
          </>
        )}
        {caseType === 'ganador_mal' && (
          <SimRow label={t('rules.penalizacion_diferencia')} value={penalizacion < 0 ? `${penalizacion}` : '0'} negative={penalizacion < 0} />
        )}
        {bonusExacto > 0 && <SimRow label={t('rules.resultado_exacto')} value={`+${bonusExacto}`} positive />}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.375rem', marginTop: '0.125rem' }}>
          <SimRow label={t('rules.example_subtotal')} value={String(subtotal)} />
        </div>
        {mult > 1 && (
          <SimRow
            label={`${t('rules.example_multiplier')} (${stages.find(s => s.key === stage)?.label})`}
            value={`×${mult}`}
          />
        )}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.375rem', marginTop: '0.125rem' }}>
          <SimRow
            label={t('rules.example_total')}
            value={total > 0 ? `+${total} pts` : `${total} pts`}
            positive={total > 0} negative={total < 0} isTotal
          />
        </div>
      </div>

    </div>
  )
}

export default function SimuladorPuntos({ config, t }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="config-section">
      <div className="config-section-header" onClick={() => setOpen(o => !o)}>
        <span>{t('config.simulator_title')}</span>
        <span className={`chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className="config-section-body" style={{ gap: '0.75rem' }}>
          <SimuladorPuntosBody config={config} t={t} />
        </div>
      )}
    </div>
  )
}
