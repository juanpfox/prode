import { supabase } from '../lib/supabase'

export async function recalculatePosiciones(competitionId) {
  // Fetch all 'posiciones' tournaments for this competition
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, mode')
    .eq('competition_id', competitionId)
    .eq('mode', 'posiciones')

  if (!tournaments || tournaments.length === 0) return

  const tournamentIds = tournaments.map(t => t.id)

  // Fetch configs for these tournaments
  const { data: configs } = await supabase
    .from('tournament_config')
    .select('*')
    .in('tournament_id', tournamentIds)

  // Fetch all predictions
  const { data: predictions } = await supabase
    .from('fixture_predictions')
    .select('*')
    .in('tournament_id', tournamentIds)

  if (!predictions || predictions.length === 0) return

  // Fetch matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_goals, away_goals, winner, went_to_pens, pen_winner, stage')
    .eq('competition_id', competitionId)
    .not('home_goals', 'is', null)

  const teamStats = {} // teamId -> stats

  for (const match of matches || []) {
    for (const teamId of [match.home_team_id, match.away_team_id]) {
      if (!teamId) continue
      if (!teamStats[teamId]) {
        teamStats[teamId] = { id: teamId, w: 0, d: 0, wp: 0, reachedSf: false, reachedFinal: false, wonFinal: false, pts: 0, gf: 0, gc: 0, initial_position: 0, group_name: '' }
      }
    }
  }
  
  const { data: teams } = await supabase.from('teams').select('id, group_name, initial_position').eq('competition_id', competitionId)
  teams?.forEach(t => {
    if (teamStats[t.id]) {
      teamStats[t.id].initial_position = t.initial_position
      teamStats[t.id].group_name = t.group_name
    } else {
      teamStats[t.id] = { id: t.id, w: 0, d: 0, wp: 0, reachedSf: false, reachedFinal: false, wonFinal: false, pts: 0, gf: 0, gc: 0, initial_position: t.initial_position, group_name: t.group_name }
    }
  })

  matches?.forEach(m => {
    const h = m.home_team_id
    const a = m.away_team_id
    if (!h || !a) return

    const hg = m.home_goals
    const ag = m.away_goals

    if (m.stage === 'sf') {
      teamStats[h].reachedSf = true
      teamStats[a].reachedSf = true
    }
    if (m.stage === 'final') {
      teamStats[h].reachedFinal = true
      teamStats[a].reachedFinal = true
      let finalWinner = m.winner
      if (finalWinner === 'draw') finalWinner = m.pen_winner
      
      if (finalWinner === 'home') teamStats[h].wonFinal = true
      if (finalWinner === 'away') teamStats[a].wonFinal = true
    }

    if (m.winner === 'draw') {
      if (m.went_to_pens) {
        if (m.pen_winner === 'home') teamStats[h].wp++
        if (m.pen_winner === 'away') teamStats[a].wp++
      } else {
        teamStats[h].d++
        teamStats[a].d++
      }
      if (m.stage === 'group') {
        teamStats[h].pts++; teamStats[a].pts++
      }
    } else if (m.winner === 'home') {
      teamStats[h].w++
      if (m.stage === 'group') teamStats[h].pts += 3
    } else if (m.winner === 'away') {
      teamStats[a].w++
      if (m.stage === 'group') teamStats[a].pts += 3
    }
    
    if (m.stage === 'group') {
      teamStats[h].gf += hg; teamStats[h].gc += ag
      teamStats[a].gf += ag; teamStats[a].gc += hg
    }
  })

  const groups = {}
  teams?.forEach(t => {
    if (!t.group_name) return
    if (!groups[t.group_name]) groups[t.group_name] = []
    const st = teamStats[t.id]
    if (st) groups[t.group_name].push(st)
  })

  const realGroupPos = {}
  for (const g in groups) {
    const sorted = groups[g].map(s => ({...s, dg: s.gf - s.gc})).sort((a,b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (a.initial_position - b.initial_position))
    sorted.forEach((t, i) => {
      realGroupPos[t.id] = i + 1
    })
  }

  const userScores = {}

  predictions.forEach(pred => {
    const key = `${pred.tournament_id}_${pred.user_id}`
    if (!userScores[key]) userScores[key] = { tournament_id: pred.tournament_id, user_id: pred.user_id, total_points: 0, matches_scored: 0 }

    const conf = configs?.find(c => c.tournament_id === pred.tournament_id)
    if (!conf) return

    const stats = teamStats[pred.team_id]
    if (!stats) return

    let multiplier = 0
    if (pred.world_position === 'champion') multiplier = conf.mult_world_1st || 0
    else if (pred.world_position === 'runner_up') multiplier = conf.mult_world_2nd || 0
    else if (pred.world_position === 'third') multiplier = conf.mult_world_3rd || 0
    else if (pred.world_position === 'fourth') multiplier = conf.mult_world_4th || 0
    else if (pred.group_position === 1) multiplier = conf.mult_group_1st || 0
    else if (pred.group_position === 2) multiplier = conf.mult_group_2nd || 0
    else if (pred.group_position === 3) multiplier = conf.mult_group_3rd || 0
    
    // If a team is placed in group but user didn't place it in Top 4, and it reached top 4, they get no multiplier for those matches?
    // The requirement says: "Si pronosticaste un equipo en el Top 4 mundial, ese multiplicador reemplaza al de grupo en todos sus partidos."
    // We implemented it exactly like that: we use world multiplier if available, otherwise group multiplier.

    let pts = 0
    pts += (stats.w * (conf.pts_win || 0)) * multiplier
    pts += (stats.wp * (conf.pts_win_pen || 0)) * multiplier
    pts += (stats.d * (conf.pts_draw || 0)) * multiplier

    if (pred.group_position && realGroupPos[pred.team_id] === pred.group_position) {
      pts += conf.pts_position_exact || 0
    }

    if (pred.world_position && ['champion','runner_up','third','fourth'].includes(pred.world_position)) {
      if (stats.reachedSf) pts += conf.pts_semifinalist || 0
    }
    if (pred.world_position && ['champion','runner_up'].includes(pred.world_position)) {
      if (stats.reachedFinal) pts += conf.pts_finalist || 0
    }
    if (pred.world_position === 'champion' && stats.wonFinal) {
      pts += conf.pts_champion_bonus || 0
    }

    userScores[key].total_points += pts
    // For matches_scored, let's just count the teams they got right or something. Or just matches they predicted.
    // Posiciones mode doesn't really have a per-match count for the user. We'll leave it as 0.
  })

  const scorePayload = Object.values(userScores).map(s => ({
    tournament_id: s.tournament_id,
    user_id: s.user_id,
    total_points: s.total_points,
    matches_scored: s.matches_scored
  }))

  if (scorePayload.length > 0) {
    await supabase.from('scores').upsert(scorePayload, { onConflict: 'tournament_id,user_id' })
  }
}
