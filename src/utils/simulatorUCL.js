// Champions League bracket simulator.
// QF and SF are two-legged ties (same pairing in round=1 and round=2, with home/away swapped).
// The pairing winner is decided by aggregate goals across both legs,
// with `pen_winner` on the second leg as the tiebreaker. The Final is a single match.
//
// Returns { [matchId]: { home_team, away_team } } keyed by match.id,
// so consumers can override the stored teams on the Final once the SF is decided.

function effective(match, preds) {
  const p = preds?.[match.id]
  const hasDb = match.home_goals !== null && match.home_goals !== undefined && match.away_goals !== null && match.away_goals !== undefined
  if (hasDb) {
    return {
      home_goals: parseInt(match.home_goals),
      away_goals: parseInt(match.away_goals),
      pen_winner: match.pen_winner ?? null,
    }
  }
  if (p && p.home_goals !== '' && p.away_goals !== '' && p.home_goals !== null && p.home_goals !== undefined && p.away_goals !== null && p.away_goals !== undefined) {
    return {
      home_goals: parseInt(p.home_goals),
      away_goals: parseInt(p.away_goals),
      pen_winner: p.pen_pick ?? null,
    }
  }
  return null
}

function aggregateWinner(leg1, leg2, preds) {
  const e1 = effective(leg1, preds)
  const e2 = effective(leg2, preds)
  if (!e1 || !e2) return null

  // In leg 1, A is home and B is away. In leg 2, the pairing is the same two teams
  // but sides are swapped. We compute totals from the perspective of leg1's teams.
  const aId = leg1.home_team_id
  const bId = leg1.away_team_id
  const aggA = e1.home_goals + e2.away_goals
  const aggB = e1.away_goals + e2.home_goals

  if (aggA > aggB) return { winnerId: aId }
  if (aggB > aggA) return { winnerId: bId }

  // Aggregate tied — decided by penalty shootout on leg 2.
  if (e2.pen_winner === 'home') return { winnerId: leg2.home_team_id }
  if (e2.pen_winner === 'away') return { winnerId: leg2.away_team_id }

  return null
}

function pairLegs(legs) {
  const map = new Map()
  for (const m of legs) {
    if (m.home_team_id == null || m.away_team_id == null) continue
    const key = [m.home_team_id, m.away_team_id].sort().join('|')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  const pairs = []
  for (const arr of map.values()) {
    if (arr.length !== 2) continue
    arr.sort((a, b) => (a.round ?? 0) - (b.round ?? 0))
    pairs.push({ leg1: arr[0], leg2: arr[1] })
  }
  return pairs
}

export function simulateChampionsLeagueBracket(matches, preds) {
  try {
    return _inner(matches, preds)
  } catch (err) {
    console.warn('simulateChampionsLeagueBracket error:', err)
    return {}
  }
}

/**
 * Returns true only when both SF ties have enough results to determine
 * a winner (both legs played for both pairs).
 */
export function areSFsResolved(matches, preds) {
  try {
    // If the final match already has real teams in the DB, SFs are definitively resolved.
    const finalMatch = matches.find(m => m.stage === 'final')
    if (finalMatch?.home_team && finalMatch?.away_team) return true

    const sfLegs = matches.filter(m => m.stage === 'sf')
    const sfPairs = pairLegs(sfLegs)
    if (sfPairs.length < 2) return false
    for (const pair of sfPairs) {
      const res = aggregateWinner(pair.leg1, pair.leg2, preds)
      if (!res) return false
    }
    return true
  } catch {
    return false
  }
}

function _inner(matches, preds) {
  const finalMatch = matches.find(m => m.stage === 'final')
  if (!finalMatch) return {}

  // If the final already has real teams stored in the DB (the bracket was officially
  // populated after the SFs completed), use those actual teams directly.
  if (finalMatch.home_team && finalMatch.away_team) {
    return {
      [finalMatch.id]: {
        home_team: finalMatch.home_team,
        away_team: finalMatch.away_team,
      },
    }
  }

  const sfLegs = matches.filter(m => m.stage === 'sf')
  const sfPairs = pairLegs(sfLegs)
  if (sfPairs.length < 2) return {}

  // Preserve a stable pairing order by earliest leg-1 kickoff.
  sfPairs.sort((a, b) => new Date(a.leg1.kickoff_at) - new Date(b.leg1.kickoff_at))

  const winnerIds = []
  for (const pair of sfPairs) {
    const res = aggregateWinner(pair.leg1, pair.leg2, preds)
    if (!res) return {}
    winnerIds.push(res.winnerId)
  }

  const teams = {}
  for (const m of matches) {
    if (m.home_team_id && m.home_team) teams[m.home_team_id] = m.home_team
    if (m.away_team_id && m.away_team) teams[m.away_team_id] = m.away_team
  }

  const [w1, w2] = winnerIds
  return {
    [finalMatch.id]: {
      home_team: teams[w1] ?? null,
      away_team: teams[w2] ?? null,
    },
  }
}
