import wc2026_combinations from '../data/wc2026_combinations.json'

// El bracket oficial del Mundial 2026 a partir de R32 (Match 73 a 88)
function getR32Mappings(combKey) {
  const comb = wc2026_combinations[combKey]
  if (!comb) {
    console.warn('Combination not found for:', combKey)
    return {}
  }
  return {
    73: ['2A', '2B'],
    74: ['1E', '3' + comb['1E']],
    75: ['1F', '2C'],
    76: ['1C', '2F'],
    77: ['1I', '3' + comb['1I']],
    78: ['2E', '2I'],
    79: ['1A', '3' + comb['1A']],
    80: ['1L', '3' + comb['1L']],
    81: ['1D', '3' + comb['1D']],
    82: ['1G', '3' + comb['1G']],
    83: ['2K', '2L'],
    84: ['1H', '2J'],
    85: ['1B', '3' + comb['1B']],
    86: ['1J', '2H'],
    87: ['1K', '3' + comb['1K']],
    88: ['2D', '2G'],
  }
}

// Mapa de los ganadores de rondas anteriores hacia las siguientes rondas
const LATER_ROUNDS = {
  // Round of 16
  89: [73, 75],
  90: [74, 77],
  91: [76, 78],
  92: [79, 80],
  93: [81, 84],
  94: [82, 86],
  95: [85, 88],
  96: [83, 87],
  // Quarter-Finals
  97: [89, 90],
  98: [91, 92],
  99: [93, 94],
  100: [95, 96],
  // Semis
  101: [97, 98],
  102: [99, 100],
  // Third place
  103: ['L101', 'L102'], // Losers of SFs
  // Final
  104: [101, 102],
}

export function simulateWorldCupBracket(matches, preds) {
  const groupMatches = matches.filter(m => m.stage === 'group')
  
  // Note: we no longer abort if some group matches lack predictions.
  // The bracket will show 'TBD' for unresolved slots instead of crashing.

  // 1. Calculate the Group Table
  const tables = {}
  groupMatches.forEach(m => {
    if (!tables[m.home_team_id] && m.home_team) {
      tables[m.home_team_id] = { ...m.home_team, id: m.home_team_id, pj: 0, pts: 0, gf: 0, gc: 0 }
    }
    if (!tables[m.away_team_id] && m.away_team) {
      tables[m.away_team_id] = { ...m.away_team, id: m.away_team_id, pj: 0, pts: 0, gf: 0, gc: 0 }
    }

    const p = preds[m.id]
    const hasDbResult = m.home_goals !== null && m.away_goals !== null
    
    if ((p && p.home_goals !== '' && p.away_goals !== '') || hasDbResult) {
      const hg = hasDbResult ? parseInt(m.home_goals) : parseInt(p.home_goals)
      const ag = hasDbResult ? parseInt(m.away_goals) : parseInt(p.away_goals)
      
      const home = tables[m.home_team_id]
      const away = tables[m.away_team_id]
      if (home && away) {
        home.pj++; away.pj++;
        home.gf += hg; home.gc += ag;
        away.gf += ag; away.gc += hg;
        if (hg > ag) { home.pts += 3 }
        else if (hg < ag) { away.pts += 3 }
        else { home.pts += 1; away.pts += 1 }
      }
    }
  })

  // Add goal difference logic
  Object.values(tables).forEach(t => { t.dg = t.gf - t.gc })

  // 2. Separate into groups
  const groups = {}
  Object.values(tables).forEach(t => {
    if (!groups[t.group_name]) groups[t.group_name] = []
    groups[t.group_name].push(t)
  })

  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']
  
  const placeholders = {} // e.g. "1A" -> { id, name, code, ... }
  const thirdPlaces = []

  groupLetters.forEach(letter => {
    if (!groups[letter]) return
    const sorted = groups[letter].sort((a,b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (a.initial_position - b.initial_position))
    
    placeholders['1' + letter] = sorted[0]
    placeholders['2' + letter] = sorted[1]
    sorted[2].group_letter = letter // save for combination lookup
    thirdPlaces.push(sorted[2])
  })

  // 3. Rank third places and get top 8
  const sortedThirdPlaces = thirdPlaces.sort((a,b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (a.initial_position - b.initial_position))
  const qualifiedThirds = sortedThirdPlaces.slice(0, 8)
  
  // Assign them to placeholders "3A", "3B", etc.
  qualifiedThirds.forEach(t => {
    placeholders['3' + t.group_letter] = t
  })

  // Get combination Key (e.g. "ABCDEFGH")
  const combKey = qualifiedThirds.map(t => t.group_letter).sort().join('')
  
  // 4. Generate R32 Mappings
  const r32Map = getR32Mappings(combKey)
  
  const bracketTeams = {} // Map match `round` to { home_team, away_team }

  // Resolve R32 
  for (const [roundStr, p] of Object.entries(r32Map)) {
    const round = parseInt(roundStr)
    bracketTeams[round] = {
      home_team: placeholders[p[0]] || null,
      away_team: placeholders[p[1]] || null
    }
  }

  // Helper to determine winner of a match based on predictions
  const getWinner = (matchRound) => {
    // Find the db match for this round
    const m = matches.find(x => x.round === matchRound)
    if (!m) return null
    const p = preds[m?.id]
    if (!p || p.home_goals === '' || p.away_goals === '') {
       // if exact match from db has result
       if (m.home_goals !== null && m.away_goals !== null) {
          if (m.home_goals > m.away_goals) return bracketTeams[matchRound]?.home_team
          if (m.home_goals < m.away_goals) return bracketTeams[matchRound]?.away_team
          if (m.pen_winner === 'home') return bracketTeams[matchRound]?.home_team
          if (m.pen_winner === 'away') return bracketTeams[matchRound]?.away_team
       }
       return null
    }

    const hg = parseInt(p.home_goals)
    const ag = parseInt(p.away_goals)
    if (hg > ag) return bracketTeams[matchRound]?.home_team
    if (hg < ag) return bracketTeams[matchRound]?.away_team
    if (p.pen_pick === 'home') return bracketTeams[matchRound]?.home_team
    if (p.pen_pick === 'away') return bracketTeams[matchRound]?.away_team
    
    return null
  }

  const getLoser = (matchRound) => {
    // find winner, then return the other one
    const w = getWinner(matchRound)
    if (!w) return null
    
    const bt = bracketTeams[matchRound]
    if (!bt) return null
    if (bt.home_team?.id === w.id) return bt.away_team
    if (bt.away_team?.id === w.id) return bt.home_team
    return null
  }

  // 5. Chain the rest of the rounds
  for (const [roundStr, src] of Object.entries(LATER_ROUNDS)) {
    const round = parseInt(roundStr)
    const [hSrc, aSrc] = src

    const home = typeof hSrc === 'number' ? getWinner(hSrc) : getLoser(parseInt(hSrc.replace('L', '')))
    const away = typeof aSrc === 'number' ? getWinner(aSrc) : getLoser(parseInt(aSrc.replace('L', '')))
    
    bracketTeams[round] = {
      home_team: home || null,
      away_team: away || null
    }
  }

  return bracketTeams
}
