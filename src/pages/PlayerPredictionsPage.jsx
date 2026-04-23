import { useState, useEffect, useRef, useMemo, Component } from "react"
import { useTranslation } from "react-i18next"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { supabase } from "../lib/supabase"
import AppShell from "../components/AppShell"
import { simulateWorldCupBracket } from "../utils/simulatorWC2026"

const FIFA_TO_ISO2 = {
  ARG: "ar", BRA: "br", FRA: "fr", GER: "de", ITA: "it", ESP: "es", POR: "pt", NED: "nl",
  ENG: "gb", SCO: "gb", WAL: "gb", NIR: "gb", USA: "us", MEX: "mx", CAN: "ca",
  JPN: "jp", KOR: "kr", AUS: "au", KSA: "sa", QAT: "qa", CRO: "hr", SRB: "rs",
  SUI: "ch", BEL: "be", DEN: "dk", POL: "pl", URU: "uy", COL: "co", CHI: "cl",
  PER: "pe", ECU: "ec", MAR: "ma", SEN: "sn", GHA: "gh", CMR: "cm", NGA: "ng",
  RSA: "za", BIH: "ba", CZE: "cz", GRE: "gr", TUR: "tr", EGY: "eg", TUN: "tn",
  CRC: "cr", PAN: "pa", JAM: "jm", HON: "hn", PAR: "py", BFA: "bf", MLI: "ml",
  HAI: "ht", SWE: "se", CPV: "cv",
}

function TeamFlag({ code, size = 18 }) {
  if (!code) return null
  const iso2 = FIFA_TO_ISO2[code] || code.slice(0, 2).toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w40/${iso2}.png`}
      alt={code}
      style={{ width: `${size}px`, height: "auto", borderRadius: "2px", display: "inline-block",
        verticalAlign: "middle", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
      onError={(e) => { e.target.style.display = "none" }}
    />
  )
}

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third_place", "final"]

class PredictionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(err, info) { console.error("PredictionErrorBoundary caught:", err, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card card-sm" style={{ textAlign: "center", padding: "2rem", margin: "2rem 1rem", color: "var(--text-muted)" }}>
          <span style={{ fontSize: "2rem", marginBottom: "0.5rem", display: "block" }}>⚠️</span>
          <p style={{ margin: "0 0 0.5rem" }}>Error al cargar esta vista</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: "1rem" }} onClick={() => this.setState({ hasError: false, error: null })}>Reintentar</button>
        </div>
      )
    }
    return this.props.children
  }
}

const WC2026_CHILDREN = {
  89:[73,75], 90:[74,77], 91:[76,78], 92:[79,80],
  93:[81,84], 94:[82,86], 95:[85,88], 96:[83,87],
  97:[89,90], 98:[91,92], 99:[93,94], 100:[95,96],
  101:[97,98], 102:[99,100], 104:[101,102],
}
const BRACKET_STAGE_ROUNDS = {
  r32:[73,75,74,77,76,78,79,80,81,84,82,86,85,88,83,87],
  r16:[89,90,91,92,93,94,95,96],
  qf:[97,98,99,100],
  sf:[101,102],
  final:[104, 103],
}
const CONN_W = 18
const CARD_GAP = 18
const ANIM = "0.35s cubic-bezier(0.4, 0, 0.2, 1)"

export default function PlayerPredictionsPage() {
  const { t, i18n } = useTranslation()
  const { id: tournamentId, userId: targetUserId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [targetUser, setTargetUser] = useState(null)
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [tournamentConfig, setTournamentConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myStatus, setMyStatus] = useState(null)
  const [view, setView] = useState(() => (new Date() >= new Date("2026-06-28T00:00:00-03:00") ? "playoffs" : "groups"))
  const [activeGroup, setActiveGroup] = useState("A")
  const [bracketOffset, setBracketOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const swipeTouchStart = useRef(null)
  const bracketContainerRef = useRef(null)

  const simulatedBracket = useMemo(() => {
    if (!tournament?.competitions?.name?.toLowerCase().includes("world cup")) return {}
    return simulateWorldCupBracket(matches, predictions)
  }, [matches, predictions, tournament])

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 640) }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => { loadAll() }, [tournamentId, targetUserId])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: tr } = await supabase
        .from("tournaments")
        .select("*, competitions(name, type, available_modes)")
        .eq("id", tournamentId).single()
      setTournament(tr)

      const { data: tp } = await supabase
        .from("tournament_players")
        .select("status")
        .eq("tournament_id", tournamentId).eq("user_id", user.id).single()
      setMyStatus(tp?.status ?? null)

      const { data: tu } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", targetUserId).single()
      setTargetUser(tu)

      if (tr?.mode === "partidos") {
        const { data: ms } = await supabase
          .from("matches")
          .select("*, home_team:teams!home_team_id(name, code, group_name, initial_position), away_team:teams!away_team_id(name, code, group_name, initial_position)")
          .eq("competition_id", tr?.competition_id)
          .order("kickoff_at")
        setMatches(ms ?? [])

        const { data: preds } = await supabase
          .from("match_predictions")
          .select("match_id, home_goals, away_goals, pen_pick")
          .eq("tournament_id", tournamentId)
          .eq("user_id", targetUserId)

        const predMap = {}
        for (const p of preds ?? []) {
          predMap[p.match_id] = { home_goals: p.home_goals ?? "", away_goals: p.away_goals ?? "", pen_pick: p.pen_pick ?? "" }
        }
        setPredictions(predMap)

        const { data: cfg } = await supabase
          .from("tournament_config")
          .select("*")
          .eq("tournament_id", tournamentId)
          .single()
        setTournamentConfig(cfg)
      }
    } finally {
      setLoading(false)
    }
  }

  function isLocked(match) {
    return match.home_goals === null && new Date(match.kickoff_at) > new Date()
  }

  const byStage = {}
  for (const m of matches) {
    if (!byStage[m.stage]) byStage[m.stage] = []
    byStage[m.stage].push(m)
  }

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>{t("common.loading")}</p>
    </AppShell>
  )

  if (myStatus !== "approved") return (
    <AppShell>
      <div className="home-empty card card-sm" style={{ marginTop: "2rem" }}>
        <span style={{ fontSize: "2rem" }}>🔒</span>
        <p style={{ color: "var(--text-muted)" }}>{t("predictions.no_access")}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/ranking")}>← {t("common.back")}</button>
      </div>
    </AppShell>
  )

  const hasMatches = matches.length > 0
  const groupLetters = ["A","B","C","D","E","F","G","H","I","J","K","L"]
  const playoffStages = STAGE_ORDER.filter(s => s !== "group" && byStage[s]?.length)

  function calculateGroupTable(groupMatches, preds) {
    const table = {}
    groupMatches.forEach(m => {
      if (m.home_team && !table[m.home_team_id]) {
        table[m.home_team_id] = { id: m.home_team_id, code: m.home_team.code, name: m.home_team.name, initial_position: m.home_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
      }
      if (m.away_team && !table[m.away_team_id]) {
        table[m.away_team_id] = { id: m.away_team_id, code: m.away_team.code, name: m.away_team.name, initial_position: m.away_team.initial_position, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }
      }
      const p = preds[m.id]
      if (p && p.home_goals !== "" && p.away_goals !== "") {
        const hg = parseInt(p.home_goals), ag = parseInt(p.away_goals)
        table[m.home_team_id].pj++; table[m.away_team_id].pj++
        table[m.home_team_id].gf += hg; table[m.home_team_id].gc += ag
        table[m.away_team_id].gf += ag; table[m.away_team_id].gc += hg
        if (hg > ag) { table[m.home_team_id].g++; table[m.home_team_id].pts += 3; table[m.away_team_id].p++ }
        else if (hg < ag) { table[m.away_team_id].g++; table[m.away_team_id].pts += 3; table[m.home_team_id].p++ }
        else { table[m.home_team_id].e++; table[m.home_team_id].pts++; table[m.away_team_id].e++; table[m.away_team_id].pts++ }
      }
    })
    return Object.values(table).map(t => ({ ...t, dg: t.gf - t.gc }))
      .sort((a,b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (a.initial_position - b.initial_position))
  }

  const groupMatches = matches.filter(m => m.stage === "group")

  return (
    <AppShell wide={view === "playoffs"}>
      <PredictionErrorBoundary>
        <div className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/ranking")}>
                ← {t("nav.leaderboard")}
              </button>
              <div>
                <h2 className="home-section-title" style={{ margin: 0, fontSize: "1.2rem" }}>
                  👤 {targetUser?.display_name ?? "Jugador"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.1rem" }}>
                  {tournament?.name}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={`btn btn-sm ${view === "groups" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("groups")} style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}>
                {t("predictions.views.groups")}
              </button>
              <button className={`btn btn-sm ${view === "playoffs" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("playoffs")} style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}>
                {t("predictions.views.playoffs")}
              </button>
              <button className={`btn btn-sm ${view === "dates" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setView("dates")} style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}>
                {t("predictions.views.dates")}
              </button>
            </div>
          </div>

          {view === "groups" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1.5rem", alignItems: "center" }}>
              {groupLetters.map(l => (
                <button key={l} onClick={() => setActiveGroup(l)}
                  className={`btn btn-sm ${activeGroup === l ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: "2.2rem", height: "2.2rem", padding: 0 }}>{l}</button>
              ))}
            </div>
          )}

          {!hasMatches && (
            <div className="home-empty card card-sm">
              <span style={{ fontSize: "2rem" }}>📅</span>
              <p style={{ color: "var(--text-muted)" }}>{t("tournaments.no_matches_found")}</p>
            </div>
          )}

          {view === "dates" && STAGE_ORDER.filter(s => byStage[s]?.length).map(stage => (
            <section key={stage} style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.06em",
                  textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                {t(`predictions.stages.${stage}`)}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {byStage[stage].map(match => (
                  <ReadOnlyMatchCard key={match.id} match={match}
                    pred={predictions[match.id] ?? {}} locked={isLocked(match)}
                    t={t} config={tournamentConfig} />
                ))}
              </div>
            </section>
          ))}

          {view === "groups" && (
            <div className="predictions-layout-grid">
              <div className="matches-column">
                <h3 style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase",
                    color: "var(--text-muted)", marginBottom: "0.625rem" }}>
                  {t("posiciones.group")} {activeGroup}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {groupMatches.filter(m => m.home_team?.group_name === activeGroup).map(match => (
                    <ReadOnlyMatchCard key={match.id} match={match}
                      pred={predictions[match.id] ?? {}} locked={isLocked(match)}
                      t={t} config={tournamentConfig} />
                  ))}
                </div>
              </div>
              <div className="table-column">
                <GroupTable
                  rows={calculateGroupTable(groupMatches.filter(m => m.home_team?.group_name === activeGroup), predictions)}
                  t={t}
                />
              </div>
            </div>
          )}

          {view === "playoffs" && (() => {
            const bracketStages = playoffStages.filter(s => s !== "third_place" && s !== "group")
            if (bracketStages.length === 0) {
              return (
                <div className="card card-sm" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: "2rem", marginBottom: "0.5rem", display: "block" }}>🏆</span>
                  <p style={{ margin: 0 }}>{t("predictions.no_playoff_matches")}</p>
                </div>
              )
            }
            const visibleCount = isMobile ? 2 : bracketStages.length
            const safeOffset = Math.min(bracketOffset, Math.max(0, bracketStages.length - visibleCount))
            const colPct = 100 / visibleCount
            const translatePct = -(safeOffset * colPct)
            const handleTouchStart = (e) => { swipeTouchStart.current = e.touches[0].clientX }
            const handleTouchEnd = (e) => {
              if (swipeTouchStart.current === null) return
              const delta = swipeTouchStart.current - e.changedTouches[0].clientX
              if (delta > 50) setBracketOffset(v => Math.min(v + 1, Math.max(0, bracketStages.length - visibleCount)))
              else if (delta < -50) setBracketOffset(v => Math.max(0, v - 1))
              swipeTouchStart.current = null
            }
            return (
              <div style={{ paddingBottom: "2rem" }}>
                <div style={{ overflow: "hidden", borderRadius: "var(--r-md)", marginBottom: "1rem",
                    border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <div style={{ display: "flex", transform: `translateX(${translatePct}%)`,
                      transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)", willChange: "transform" }}>
                    {bracketStages.map(stage => (
                      <h3 key={stage} style={{ flex: `0 0 ${colPct}%`, width: `${colPct}%`,
                          fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase",
                          color: "var(--text)", margin: 0, padding: "0.75rem 1rem",
                          textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {stage === "final" && !isMobile 
                        ? `${t("predictions.stages.final")} & ${t("predictions.stages.third_place")}`
                        : t(`predictions.stages.${stage}`)}
                      </h3>
                    ))}
                  </div>
                </div>
                <div ref={bracketContainerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                  <ReadOnlyBracketTree
                    byStage={byStage} bracketStages={bracketStages}
                    simulatedBracket={simulatedBracket} predictions={predictions}
                    t={t} colPct={colPct} translatePct={translatePct}
                    offset={safeOffset} visibleCount={visibleCount} config={tournamentConfig}
                  />
                </div>

                {bracketStages.length > visibleCount && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", paddingTop: "1.25rem" }}>
                    {bracketStages.slice(0, bracketStages.length - visibleCount + 1).map((_, i) => (
                      <button key={i} onClick={() => setBracketOffset(i)} style={{
                        width: i === safeOffset ? "20px" : "8px", height: "8px",
                        borderRadius: "9999px", border: "none", cursor: "pointer",
                        background: i === safeOffset ? "var(--primary)" : "var(--border-strong)",
                        transition: "all 0.2s ease", padding: 0,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </PredictionErrorBoundary>
    </AppShell>
  )
}

function ReadOnlyBracketTree({ byStage, bracketStages, simulatedBracket, predictions, t, colPct, translatePct, offset, visibleCount, config }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const cardRef = useRef(null)
  const [cardH, setCardH] = useState(null)
  useEffect(() => {
    if (!cardRef.current) return
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect?.height
      if (h && h > 0) setCardH(h)
    })
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [])

  const matchByRound = {}
  Object.values(byStage).flat().forEach(m => { if (m.round) matchByRound[m.round] = m })
  const allStageRounds = useMemo(() => bracketStages.map(s => BRACKET_STAGE_ROUNDS[s] || []), [bracketStages])

  const roundY = useMemo(() => {
    if (!cardH) return {}
    const pos = {}
    const anchorRounds = allStageRounds[offset] || []
    anchorRounds.forEach((r, i) => { pos[r] = i * (cardH + CARD_GAP) })
    for (let si = offset + 1; si < bracketStages.length; si++) {
      const rounds = allStageRounds[si] || []
      rounds.forEach((r, idx) => {
        const children = WC2026_CHILDREN[r] || []
        const childCentres = children.map(c => pos[c] != null ? pos[c] + cardH / 2 : null).filter(y => y !== null)
        if (childCentres.length === 2) pos[r] = (childCentres[0] + childCentres[1]) / 2 - cardH / 2
        else if (childCentres.length === 1) pos[r] = childCentres[0] - cardH / 2
        else {
          if (r === 103 && pos[104] != null) pos[r] = pos[104] + cardH + CARD_GAP * 2
          else pos[r] = idx * (cardH + CARD_GAP)
        }
      })
    }
    for (let si = offset - 1; si >= 0; si--) {
      const rounds = allStageRounds[si] || []
      const nextRounds = allStageRounds[si + 1] || []
      const c2p = {}
      nextRounds.forEach(pr => (WC2026_CHILDREN[pr] || []).forEach(c => { c2p[c] = pr }))
      const parentChildren = {}
      rounds.forEach(r => {
        const pr = c2p[r]
        if (pr != null) { if (!parentChildren[pr]) parentChildren[pr] = []; parentChildren[pr].push(r) }
      })
      Object.entries(parentChildren).forEach(([pr, kids]) => {
        const parentY = pos[parseInt(pr)]
        if (parentY == null) return
        const parentCentre = parentY + cardH / 2
        if (kids.length === 2) {
          const spacing = cardH + CARD_GAP
          pos[kids[0]] = parentCentre - spacing / 2 - cardH / 2
          pos[kids[1]] = parentCentre + spacing / 2 - cardH / 2
        } else if (kids.length === 1) { pos[kids[0]] = parentCentre - cardH / 2 }
      })
      rounds.forEach((r, idx) => { if (pos[r] == null) pos[r] = idx * (cardH + CARD_GAP) })
    }
    return pos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardH, offset, bracketStages.join(",")])

  const totalH = useMemo(() => {
    if (!cardH) return 0
    const allY = Object.values(roundY)
    if (!allY.length) return 0
    return Math.max(...allY) + cardH
  }, [roundY, cardH])

  const renderCard = (round) => {
    const match = matchByRound[round]
    if (!match) return <div style={{ minHeight: 80, opacity: 0.4 }} />
    const enriched = { ...match,
      home_team: simulatedBracket[round]?.home_team || match.home_team,
      away_team: simulatedBracket[round]?.away_team || match.away_team,
    }
    return <ReadOnlyMatchCard stacked={true} match={enriched} pred={predictions[match.id] ?? {}} locked={match.home_goals === null && new Date(match.kickoff_at) > new Date()} t={t} config={config} />
  }

  const probeRound = (allStageRounds[0] || [])[0]
  const probeMatch = probeRound ? matchByRound[probeRound] : null
  const trn = `top ${ANIM}, height ${ANIM}`

  return (
    <div style={{ overflowX: "clip", overflowY: "visible" }}>
      {probeMatch && (
        <div ref={cardRef} style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", width: `${colPct}%` }}>
          <ReadOnlyMatchCard stacked={true} match={probeMatch} pred={{ home_goals: "1", away_goals: "1" }} locked={false} t={t} />
        </div>
      )}
      {cardH && totalH > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "nowrap",
            transform: `translateX(${translatePct}%)`, transition: `transform ${ANIM}`,
            willChange: "transform", padding: "0.75rem 0" }}>
          {bracketStages.map((stage, si) => {
            const rounds = allStageRounds[si] || []
            const isLast = si === bracketStages.length - 1
            const nextRounds = !isLast ? (allStageRounds[si + 1] || []) : []
            return (
              <div key={stage} data-stage-idx={si} style={{ flex: `0 0 ${colPct}%`, width: `${colPct}%`,
                  boxSizing: "border-box", paddingRight: isLast ? 0 : CONN_W,
                  position: "relative", height: totalH, overflow: "visible", transition: `height ${ANIM}` }}>
                {rounds.map(round => {
                  const y = roundY[round] ?? 0
                  return (
                    <div key={round} data-round={round} style={{ position: "absolute", top: y,
                        left: 0, right: isLast ? 0 : CONN_W, height: cardH, transition: trn }}>
                      {renderCard(round)}
                    </div>
                  )
                })}
                {!isLast && nextRounds.map(parentRound => {
                  const children = WC2026_CHILDREN[parentRound] || []
                  const childrenInCol = children.filter(c => rounds.includes(c))
                  if (childrenInCol.length === 1) {
                    const cy = roundY[childrenInCol[0]]
                    if (cy == null) return null
                    return (
                      <div key={`conn-${parentRound}`} style={{ position: "absolute", right: 0,
                          top: cy + cardH / 2, width: CONN_W,
                          borderBottom: "2px solid var(--border-strong)", pointerEvents: "none", transition: trn }} />
                    )
                  }
                  if (childrenInCol.length !== 2) return null
                  const y0 = roundY[childrenInCol[0]]
                  const y1 = roundY[childrenInCol[1]]
                  if (y0 == null || y1 == null) return null
                  const topCentre = Math.min(y0, y1) + cardH / 2
                  const botCentre = Math.max(y0, y1) + cardH / 2
                  const armH = botCentre - topCentre
                  const midY = (topCentre + botCentre) / 2
                  return (
                    <div key={`conn-${parentRound}`}>
                      <div style={{ position: "absolute", right: CONN_W / 2, top: topCentre, width: CONN_W / 2, borderBottom: "2px solid var(--border-strong)", pointerEvents: "none", transition: trn }} />
                      <div style={{ position: "absolute", right: CONN_W / 2, top: botCentre, width: CONN_W / 2, borderBottom: "2px solid var(--border-strong)", pointerEvents: "none", transition: trn }} />
                      <div style={{ position: "absolute", right: CONN_W / 2, top: topCentre, height: armH, borderLeft: "2px solid var(--border-strong)", pointerEvents: "none", transition: trn }} />
                      <div style={{ position: "absolute", right: 0, top: midY, width: CONN_W / 2, borderBottom: "2px solid var(--border-strong)", pointerEvents: "none", transition: trn }} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupTable({ rows, t }) {
  return (
    <div className="card card-sm" style={{ padding: 0 }}>
      <div style={{ padding: "0.75rem 0.875rem", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 800 }}>{t("nav.leaderboard")}</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface-3)", textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "0.5rem 0.875rem", fontWeight: 700 }}>#</th>
              <th style={{ padding: "0.5rem 0.25rem", fontWeight: 700 }}>{t("predictions.table.team")}</th>
              <th style={{ padding: "0.5rem 0.25rem", textAlign: "center", fontWeight: 700 }}>{t("predictions.table.pj")}</th>
              <th style={{ padding: "0.5rem 0.25rem", textAlign: "center", fontWeight: 700 }}>{t("predictions.table.pts")}</th>
              <th style={{ padding: "0.5rem 0.25rem", textAlign: "center", fontWeight: 700 }}>{t("predictions.table.dif")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.625rem 0.875rem", fontWeight: 800, color: i < 2 ? "var(--primary)" : "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ padding: "0.625rem 0.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <TeamFlag code={r.code} size={14} />
                    <span style={{ fontWeight: 600 }}>{t(`teams.${r.code}`, { defaultValue: r.name })}</span>
                  </div>
                </td>
                <td style={{ padding: "0.625rem 0.25rem", textAlign: "center" }}>{r.pj}</td>
                <td style={{ padding: "0.625rem 0.25rem", textAlign: "center", fontWeight: 800 }}>{r.pts}</td>
                <td style={{ padding: "0.625rem 0.25rem", textAlign: "center" }}>{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultBubble({ val, muted }) {
  return (
    <span className="result-bubble" style={{ display: "inline-flex", alignItems: "center",
        justifyContent: "center", width: "2rem", height: "2rem", borderRadius: "var(--r-md)",
        background: muted ? "var(--surface-2)" : "var(--surface-3)",
        fontWeight: 800, fontSize: "1rem",
        color: muted ? "var(--text-subtle)" : "var(--text)" }}>
      {val}
    </span>
  )
}

function calcMatchPoints(match, pred, config) {
  if (!config) return null
  const pHome = parseInt(pred.home_goals)
  const pAway = parseInt(pred.away_goals)
  const rHome = match.home_goals
  const rAway = match.away_goals
  if (isNaN(pHome) || isNaN(pAway) || rHome === null || rAway === null) return null
  const exactBoth = pHome === rHome && pAway === rAway
  const predWinner = pHome > pAway ? "home" : pHome < pAway ? "away" : "draw"
  const realWinner = match.winner
  const correctWinner = predWinner === realWinner
  const stageMultMap = { group: 1, r32: 1, r16: config.mult_r16 ?? 2, qf: config.mult_qf ?? 3, sf: config.mult_sf ?? 4, third_place: 1, final: config.mult_final ?? 6 }
  const mult = stageMultMap[match.stage] ?? 1
  let pts = 0
  if (correctWinner) pts += realWinner === "draw" ? (config.pts_draw ?? 1) : (config.pts_win ?? 3)
  if (exactBoth) { pts += config.pts_exact_both ?? 3 } else {
    let exactOne = 0
    if (pHome === rHome) exactOne++
    if (pAway === rAway) exactOne++
    pts += exactOne * (config.pts_exact_one ?? 1)
  }
  if (config.pts_diff_correct) {
    pts += config.pts_diff_correct - Math.abs((pHome - pAway) - (rHome - rAway))
  }
  return pts * mult
}

function PredResult({ match, pred, t, config }) {
  const pHome = parseInt(pred.home_goals), pAway = parseInt(pred.away_goals)
  const rHome = match.home_goals, rAway = match.away_goals
  const exactBoth = pHome === rHome && pAway === rAway
  const predWinner = pHome > pAway ? "home" : pHome < pAway ? "away" : "draw"
  const realWinner = match.winner
  const correctWinner = predWinner === realWinner
  const correctDraw = correctWinner && realWinner === "draw"
  const pts = calcMatchPoints(match, pred, config)
  return (
    <div style={{ marginTop: "0.5rem", padding: "0.375rem 0.625rem", background: "var(--surface-2)",
        borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.9rem" }}>{exactBoth ? "🎯" : correctWinner ? "✅" : "❌"}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flex: 1 }}>
        {t("predictions.result")}: {rHome}-{rAway}
        {exactBoth ? ` · ${t("predictions.exact")}` : correctDraw ? ` · ${t("predictions.draw_ok")}` : correctWinner ? ` · ${t("predictions.winner_ok")}` : ` · ${t("predictions.miss")}`}
      </span>
      {pts !== null && (
        <span style={{ fontSize: "0.75rem", fontWeight: 700,
            color: pts > 0 ? "var(--primary)" : "var(--text-subtle)", whiteSpace: "nowrap" }}>
          {pts > 0 ? `+${pts} pts` : `${pts} pts`}
        </span>
      )}
    </div>
  )
}

function ReadOnlyMatchCard({ match, pred, locked, t, stacked, config }) {
  const home = t(`teams.${match.home_team?.code}`, { defaultValue: match.home_team?.name ?? "?" })
  const away = t(`teams.${match.away_team?.code}`, { defaultValue: match.away_team?.name ?? "?" })
  const kickoff = new Date(match.kickoff_at)
  const kickoffStr = kickoff.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    + " " + kickoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  const hasResult = match.home_goals !== null
  const predFilled = pred.home_goals !== "" && pred.home_goals !== undefined

  if (locked) {
    return (
      <div className={`card card-sm ${stacked ? "match-card-stacked" : ""}`}
          style={{ opacity: 0.45, padding: "0.75rem 0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{kickoffStr}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 600 }}>🔒</span>
        </div>
        <div className="match-card-grid">
          {stacked ? (
            <>
              <div className="match-team-col home"><TeamFlag code={match.home_team?.code} size={16} /><span className="match-team-name">{home}</span></div>
              <div className="match-team-col away"><TeamFlag code={match.away_team?.code} size={16} /><span className="match-team-name">{away}</span></div>
              <div className="match-center-col"><ResultBubble val="?" muted /><ResultBubble val="?" muted /></div>
            </>
          ) : (
            <>
              <div className="match-team-col home"><span className="match-team-name">{home}</span><TeamFlag code={match.home_team?.code} /></div>
              <div className="match-center-col"><ResultBubble val="?" muted /><span className="match-vs-sep" style={{ color: "var(--text-muted)", fontWeight: 700 }}>-</span><ResultBubble val="?" muted /></div>
              <div className="match-team-col away"><TeamFlag code={match.away_team?.code} /><span className="match-team-name">{away}</span></div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`card card-sm ${stacked ? "match-card-stacked" : ""}`}
        style={{ padding: "0.75rem 0.875rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{kickoffStr}</span>
        {hasResult && <span style={{ fontSize: "0.7rem", color: "var(--warning)", fontWeight: 600 }}>🏁 {t("predictions.finished")}</span>}
      </div>
      <div className="match-card-grid">
        {stacked ? (
          <>
            <div className="match-team-col home"><TeamFlag code={match.home_team?.code} size={16} /><span className="match-team-name">{home}</span></div>
            <div className="match-team-col away"><TeamFlag code={match.away_team?.code} size={16} /><span className="match-team-name">{away}</span></div>
            <div className="match-center-col">
              <ResultBubble val={predFilled ? pred.home_goals : "?"} muted={!predFilled} />
              <ResultBubble val={predFilled ? pred.away_goals : "?"} muted={!predFilled} />
            </div>
          </>
        ) : (
          <>
            <div className="match-team-col home"><span className="match-team-name">{home}</span><TeamFlag code={match.home_team?.code} /></div>
            <div className="match-center-col">
              <ResultBubble val={predFilled ? pred.home_goals : "?"} muted={!predFilled} />
              <span className="match-vs-sep" style={{ color: "var(--text-muted)", fontWeight: 700 }}>-</span>
              <ResultBubble val={predFilled ? pred.away_goals : "?"} muted={!predFilled} />
            </div>
            <div className="match-team-col away"><TeamFlag code={match.away_team?.code} /><span className="match-team-name">{away}</span></div>
          </>
        )}
      </div>
      {hasResult && predFilled && <PredResult match={match} pred={pred} t={t} config={config} />}
    </div>
  )
}
