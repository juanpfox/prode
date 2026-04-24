import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FOOTBALL_DATA_API_KEY = Deno.env.get("FOOTBALL_DATA_API_KEY") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

// Season year for football-data.org (2024 = season 2024-25)
const SEASON = Deno.env.get("UCL_SEASON") ?? "2024"

const UCL_COMPETITION_ID = "00000000-0000-0000-0000-000000000002"

// Maps football-data.org team identifiers → DB team code
// Keys: full name, shortName, or tla returned by the API
const TEAM_CODE_MAP: Record<string, string> = {
  "Liverpool FC": "LIV",
  "Liverpool": "LIV",
  "LIV": "LIV",
  "FC Barcelona": "BAR",
  "Barcelona": "BAR",
  "BAR": "BAR",
  "FCB": "BAR",
  "Club Atlético de Madrid": "ATM",
  "Atlético de Madrid": "ATM",
  "Atlético Madrid": "ATM",
  "Atletico Madrid": "ATM",
  "ATM": "ATM",
  "Real Madrid CF": "RMA",
  "Real Madrid": "RMA",
  "RMA": "RMA",
  "Arsenal FC": "ARS",
  "Arsenal": "ARS",
  "ARS": "ARS",
  "Paris Saint-Germain FC": "PSG",
  "Paris Saint-Germain": "PSG",
  "PSG": "PSG",
  "Sporting CP": "SCP",
  "Sporting Lisboa": "SCP",
  "Sporting Clube de Portugal": "SCP",
  "Sporting": "SCP",
  "SCP": "SCP",
  "FC Bayern München": "BAY",
  "Bayern München": "BAY",
  "Bayern Munich": "BAY",
  "Bayern": "BAY",
  "BAY": "BAY",
}

function resolveCode(team: { name: string; shortName?: string; tla?: string }): string | null {
  return (
    TEAM_CODE_MAP[team.name] ??
    TEAM_CODE_MAP[team.shortName ?? ""] ??
    TEAM_CODE_MAP[team.tla ?? ""] ??
    null
  )
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    // Use service-role key so we can write to matches regardless of RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch UCL matches from football-data.org
    const apiRes = await fetch(
      `https://api.football-data.org/v4/competitions/CL/matches?season=${SEASON}`,
      { headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY } }
    )

    // Capture rate-limit headers for monitoring
    const requestsLeft = apiRes.headers.get("X-Requests-Available-Minute")
    const resetAt = apiRes.headers.get("X-RequestCounter-Reset")

    if (apiRes.status === 429) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit reached", reset_at: resetAt }),
        { status: 429, headers: { ...CORS, "Content-Type": "application/json" } }
      )
    }

    if (!apiRes.ok) {
      const body = await apiRes.text()
      throw new Error(`football-data.org ${apiRes.status}: ${body}`)
    }

    const apiData = await apiRes.json()
    const finishedMatches = (apiData.matches ?? []).filter(
      (m: any) => m.status === "FINISHED"
    )

    // 2. Load DB matches with team codes
    const { data: dbMatches, error: dbError } = await supabase
      .from("matches")
      .select(
        "id, stage, home_goals, away_goals, winner, " +
        "home_team:teams!home_team_id(code), away_team:teams!away_team_id(code)"
      )
      .eq("competition_id", UCL_COMPETITION_ID)

    if (dbError) throw new Error(dbError.message)

    // Build lookup map: "HOME_CODE|AWAY_CODE" → db match row
    // This is unique per leg (each team appears as home only once per stage)
    const dbMatchMap = new Map<string, any>()
    for (const m of dbMatches ?? []) {
      const key = `${m.home_team?.code}|${m.away_team?.code}`
      dbMatchMap.set(key, m)
    }

    // 3. Sync each finished API match
    let updated = 0
    const skipped: string[] = []

    for (const apiMatch of finishedMatches) {
      const homeCode = resolveCode(apiMatch.homeTeam)
      const awayCode = resolveCode(apiMatch.awayTeam)

      if (!homeCode || !awayCode) {
        skipped.push(`Unknown team: "${apiMatch.homeTeam.name}" vs "${apiMatch.awayTeam.name}"`)
        continue
      }

      const dbMatch = dbMatchMap.get(`${homeCode}|${awayCode}`)
      if (!dbMatch) {
        skipped.push(`No DB entry: ${homeCode} vs ${awayCode}`)
        continue
      }

      const { fullTime, winner: apiWinner, duration } = apiMatch.score
      const homeGoals: number = fullTime.home
      const awayGoals: number = fullTime.away
      const wentToPens: boolean = duration === "PENALTY_SHOOTOUT"

      let winner: string
      let penWinner: string | null = null

      if (wentToPens) {
        // In shootouts fullTime score is tied; actual winner set via penWinner
        winner = "draw"
        penWinner = apiWinner === "HOME_TEAM" ? "home" : "away"
      } else {
        winner =
          apiWinner === "HOME_TEAM" ? "home" :
          apiWinner === "AWAY_TEAM" ? "away" : "draw"
      }

      // Skip if already identical to avoid unnecessary writes + recalcs
      if (
        dbMatch.home_goals === homeGoals &&
        dbMatch.away_goals === awayGoals &&
        dbMatch.winner === winner
      ) continue

      const { error: updateError } = await supabase
        .from("matches")
        .update({ home_goals: homeGoals, away_goals: awayGoals, winner, went_to_pens: wentToPens, pen_winner: penWinner })
        .eq("id", dbMatch.id)

      if (updateError) {
        skipped.push(`Write failed (${homeCode} vs ${awayCode}): ${updateError.message}`)
      } else {
        updated++
      }
    }

    // 4. Recalculate points only when something changed
    if (updated > 0) {
      const { error: rpcError } = await supabase.rpc(
        "recalculate_all_scores_for_competition",
        { p_competition_id: UCL_COMPETITION_ID }
      )
      if (rpcError) console.error("recalc error:", rpcError.message)
    }

    const body = {
      success: true,
      synced_at: new Date().toISOString(),
      api_finished: finishedMatches.length,
      db_updated: updated,
      skipped,
      rate_limit: { requests_left_this_minute: requestsLeft, reset_at: resetAt },
    }

    return new Response(JSON.stringify(body), {
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("sync-ucl-results:", err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})
