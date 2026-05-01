import type {
  FPLBootstrap,
  FPLFixture,
  FPLTeam,
  SquadPlayer,
  UpcomingFixture,
  AppState,
  FPLEntry,
  FPLPicks,
} from './types'

export const posLabel = (type: number) =>
  ['', 'GK', 'DEF', 'MID', 'FWD'][type] ?? '?'

export const fmt = (cost: number) => `£${(cost / 10).toFixed(1)}m`

const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null

export function buildFixtureMap(
  fixtures: FPLFixture[]
): Record<number, UpcomingFixture[]> {
  const map: Record<number, UpcomingFixture[]> = {}

  fixtures
    .filter((f) => !f.finished && f.event != null)
    .forEach((f) => {
      const pairs = [
        { team: f.team_h, opp: f.team_a, home: true,  diff: f.team_h_difficulty },
        { team: f.team_a, opp: f.team_h, home: false, diff: f.team_a_difficulty },
      ]
      pairs.forEach(({ team, opp, home, diff }) => {
        if (!map[team]) map[team] = []
        map[team].push({ gw: f.event!, opponent: opp, is_home: home, difficulty: diff })
      })
    })

  Object.values(map).forEach((arr) => arr.sort((a, b) => a.gw - b.gw))
  return map
}

export function buildSquad(
  bootstrap: FPLBootstrap,
  picks: FPLPicks,
  fixtureMap: Record<number, UpcomingFixture[]>,
  teamMap: Record<number, FPLTeam>,
  nextGWs: number[]
): SquadPlayer[] {
  const pMap = Object.fromEntries(bootstrap.elements.map((el) => [el.id, el]))

  return picks.picks.map((pick) => {
    const el  = pMap[pick.element]
    const fix = (fixtureMap[el.team] ?? [])
      .filter((f) => nextGWs.includes(f.gw))
      .slice(0, 5)

    const avgFdr3  = avg(fix.slice(0, 3).map((f) => f.difficulty)) ?? 5
    const avgDFdr3 = avg(fix.slice(0, 3).map((f) => f.dDifficulty ?? f.difficulty)) ?? 5

    return {
      ...el,
      pick,
      teamShort: teamMap[el.team]?.short_name ?? '?',
      teamFull:  teamMap[el.team]?.name ?? '?',
      fixtures: fix,
      avgFdr3,
      avgDFdr3,
    }
  })
}

/**
 * Build a map of team_id → avg goals conceded per game over their last N fixtures.
 * Uses actual match scores from completed fixtures — captures genuine recent form.
 */
export function buildRollingConcededMap(
  fixtures: FPLFixture[],
  lastN = 6
): Record<number, number> {
  // Sort completed fixtures newest-first so we grab the most recent N easily
  const completed = fixtures
    .filter((f) => f.finished && f.team_h_score != null && f.team_a_score != null)
    .sort((a, b) => (b.event ?? 0) - (a.event ?? 0))

  const concededLists: Record<number, number[]> = {}

  for (const f of completed) {
    if (!concededLists[f.team_h]) concededLists[f.team_h] = []
    if (!concededLists[f.team_a]) concededLists[f.team_a] = []

    // Home team conceded = away score; away team conceded = home score
    if (concededLists[f.team_h].length < lastN) {
      concededLists[f.team_h].push(f.team_a_score!)
    }
    if (concededLists[f.team_a].length < lastN) {
      concededLists[f.team_a].push(f.team_h_score!)
    }
  }

  const result: Record<number, number> = {}
  for (const [teamId, goals] of Object.entries(concededLists)) {
    result[Number(teamId)] = goals.reduce((a, b) => a + b, 0) / goals.length
  }
  return result
}

/**
 * Compute blended dynamic FDR (1–5).
 *
 * 40% — FPL static strength ratings (slow-moving, season-long quality signal)
 * 60% — Rolling goals conceded last 6 games (recent form, captures slumps/streaks)
 *
 * More goals conceded by opponent = easier fixture = lower dFDR.
 * Stronger static defence = harder fixture = higher dFDR.
 */
function computeDynamicFdrFromStrength(
  opponent: FPLTeam,
  isHome: boolean,
  allTeams: FPLTeam[],
  rollingConceded: Record<number, number>
): number {
  // ── Component 1: Static strength (40%) ───────────────────
  // Opponent plays away when I'm home → use their away defensive strength
  const oppStr = isHome
    ? opponent.strength_defence_away
    : opponent.strength_defence_home
  const allStr = allTeams.map((t) =>
    isHome ? t.strength_defence_away : t.strength_defence_home
  )
  const sMin = Math.min(...allStr)
  const sMax = Math.max(...allStr)
  const staticNorm = sMax === sMin ? 0.5 : (oppStr - sMin) / (sMax - sMin)
  const staticFdr  = 1 + 4 * staticNorm   // 1 (weak defence) → 5 (strong defence)

  // ── Component 2: Rolling conceded (60%) ──────────────────
  const leagueAvgConceded = 1.2   // sensible Premier League fallback
  const avgConceded = rollingConceded[opponent.id] ?? leagueAvgConceded

  const allConceded = Object.values(rollingConceded)
  const cMin = Math.min(...allConceded, 0)
  const cMax = Math.max(...allConceded, 2)
  // More conceded = weaker defence = lower dFDR, so invert the normalisation
  const rollingNorm = cMax === cMin ? 0.5 : (avgConceded - cMin) / (cMax - cMin)
  const rollingFdr  = 1 + 4 * (1 - rollingNorm)  // 1 (leaky) → 5 (watertight)

  // ── Blend ────────────────────────────────────────────────
  const blended = 0.4 * staticFdr + 0.6 * rollingFdr
  return parseFloat(blended.toFixed(2))
}

export function buildAppState(
  bootstrap: FPLBootstrap,
  teamInfo: FPLEntry,
  picks: FPLPicks,
  fixtures: FPLFixture[],
  currentGW: number
): AppState {
  const teamMap = Object.fromEntries(bootstrap.teams.map((t) => [t.id, t]))
  const allTeams = bootstrap.teams

  const nextEv  = bootstrap.events.find((e) => e.is_next)
  const startGW = nextEv ? nextEv.id : currentGW
  const nextGWs = [0, 1, 2, 3, 4].map((i) => startGW + i)

  const fixtureMap     = buildFixtureMap(fixtures)
  const rollingConceded = buildRollingConcededMap(fixtures)

  // Inject blended dDifficulty: 40% FPL strength + 60% rolling goals conceded
  for (const fixes of Object.values(fixtureMap)) {
    for (const fix of fixes) {
      const opp = teamMap[fix.opponent]
      if (opp) {
        fix.dDifficulty = computeDynamicFdrFromStrength(opp, fix.is_home, allTeams, rollingConceded)
      }
    }
  }

  const squad = buildSquad(bootstrap, picks, fixtureMap, teamMap, nextGWs)

  return { bootstrap, teamInfo, picks, currentGW, nextGWs, squad, teamMap, fixtureMap, understat: {} }
}

// ── Team Colors (2024/25 Premier League) ──────────────────────
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ARS: { primary: '#EF0107', secondary: '#FFFFFF' },
  AVL: { primary: '#670E36', secondary: '#95BFE5' },
  BOU: { primary: '#DA291C', secondary: '#000000' },
  BRE: { primary: '#E30613', secondary: '#FFFFFF' },
  BHA: { primary: '#0057B8', secondary: '#FFFFFF' },
  CHE: { primary: '#034694', secondary: '#FFFFFF' },
  CRY: { primary: '#1B458F', secondary: '#C4122E' },
  EVE: { primary: '#003399', secondary: '#FFFFFF' },
  FUL: { primary: '#FFFFFF',  secondary: '#CC0000' },
  IPS: { primary: '#3A64A3', secondary: '#FFFFFF' },
  LEI: { primary: '#003090', secondary: '#FDBE11' },
  LIV: { primary: '#C8102E', secondary: '#00B2A9' },
  MCI: { primary: '#6CABDD', secondary: '#FFFFFF' },
  MUN: { primary: '#DA291C', secondary: '#FBE122' },
  NEW: { primary: '#241F20', secondary: '#FFFFFF' },
  NFO: { primary: '#DD0000', secondary: '#FFFFFF' },
  SOU: { primary: '#D71920', secondary: '#FFFFFF' },
  TOT: { primary: '#132257', secondary: '#FFFFFF' },
  WHU: { primary: '#7A263A', secondary: '#1BB1E7' },
  WOL: { primary: '#FDB913', secondary: '#231F20' },
}

// ── Formation helpers ──────────────────────────────────────────
export function detectFormation(squad: SquadPlayer[]): string {
  const s = squad.slice(0, 11)
  const d = s.filter((p) => p.element_type === 2).length
  const m = s.filter((p) => p.element_type === 3).length
  const f = s.filter((p) => p.element_type === 4).length
  return `${d}-${m}-${f}`
}

/** Returns {x, y} as percentages on the pitch (0–100).
 *  y=10 = top (attack end), y=88 = bottom (GK end). */
export function pitchPosition(
  elementType: number,
  index: number,
  groupSize: number
): { x: number; y: number } {
  const yMap: Record<number, number> = { 1: 86, 2: 66, 3: 43, 4: 18 }
  const y = yMap[elementType] ?? 50
  const x = ((index + 1) / (groupSize + 1)) * 100
  return { x, y }
}

// ── Squad Rating (1–100) ──────────────────────────────────────
export function calculateSquadRating(state: AppState): {
  score: number
  formScore: number
  fixtureScore: number
  availScore: number
  avgForm: number
  avgFdr: number
  fitCount: number
} {
  const starting = state.squad.slice(0, 11)

  // Form (0–40): avg form of starters normalised against a ceiling of 8
  const avgForm = starting.reduce((s, p) => s + parseFloat(p.form || '0'), 0) / 11
  const formScore = Math.min((avgForm / 8) * 40, 40)

  // Fixtures (0–35): use dFDR if available, else static FDR
  const avgFdr = starting.reduce(
    (s, p) => s + (p.fixtures[0]?.dDifficulty ?? p.fixtures[0]?.difficulty ?? 4), 0
  ) / 11
  const fixtureScore = Math.max(0, ((5 - avgFdr) / 4) * 35)

  // Availability (0–25): deduct for doubts/injuries
  const fitCount = starting.filter((p) => p.status === 'a').length
  const availScore = starting.reduce((s, p) => {
    if (p.status === 'a') return s + 25 / 11
    if (p.status === 'd') return s + (25 / 11) * 0.4
    return s
  }, 0)

  const score = Math.round(Math.min(100, Math.max(1, formScore + fixtureScore + availScore)))
  return { score, formScore, fixtureScore, availScore, avgForm, avgFdr, fitCount }
}

/** Returns a Tailwind colour class for a given FDR value */
// ── Recommended Starting XI ───────────────────────────────────

/**
 * Score a player for selection purposes.
 *
 * Formula: attackContrib × fixtureEase × availability × formNudge
 *
 * Weights by position:
 *   GK  — saves/90 + clean-sheet rate (CS = 6 pts for GK)
 *   DEF — CS rate dominant + xGI/90 bonus
 *   MID — xG/90 × 5 + xA/90 × 3 + small CS bonus
 *   FWD — xG/90 × 6 + xA/90 × 2.5
 *
 * fixtureEase = (6 - dFDR) / 5  → normalised 0.2–1.0 (hard multiplier)
 * availability = 1.0 / 0.75 / 0.40 / 0.10  (hard gate)
 * formNudge = 1 + (form/10) × 0.2  → ±20% max modifier
 *
 * Cold-start fallback: < 3 games of minutes → use points_per_game instead.
 */
export function playerScore(p: SquadPlayer): number {
  // ── Fixture ease (most important) ───────────────────────────
  const dFdr      = p.fixtures[0]?.dDifficulty ?? p.fixtures[0]?.difficulty ?? 3
  const fixtureEase = (6 - dFdr) / 5        // 1.0 = easiest (dFDR 1), 0.2 = hardest (dFDR 5)

  // ── Availability (hard gate) ──────────────────────────────
  const avail =
    p.status === 'a'                                    ? 1.00 :
    (p.chance_of_playing_next_round ?? 0) >= 75         ? 0.75 :
    (p.chance_of_playing_next_round ?? 0) >= 50         ? 0.40 : 0.10

  // ── Form nudge (least important, ±20% only) ───────────────
  const form      = parseFloat(p.form || '0')
  const formNudge = 1 + (form / 10) * 0.2

  // ── Attack contribution (position-dependent) ─────────────
  const gamesPlayed = (p.minutes ?? 0) / 90
  const hasData     = gamesPlayed >= 3

  const ppgFallback = parseFloat(p.points_per_game || '0') * 0.3

  let attackContrib: number

  if (!hasData) {
    // Not enough minutes — use PPG as a neutral proxy
    attackContrib = ppgFallback
  } else if (p.element_type === 1) {
    // GK: saves per 90 + clean sheet rate × 6 (CS = 6 pts for GK)
    const savesP90 = (p.saves ?? 0) / gamesPlayed
    const csRate   = (p.clean_sheets ?? 0) / gamesPlayed
    attackContrib  = savesP90 * 0.5 + csRate * 6
  } else if (p.element_type === 2) {
    // DEF: CS is dominant; xGI is a bonus for attacking defenders
    const csRate  = (p.clean_sheets ?? 0) / gamesPlayed
    const xGI90   = parseFloat(p.expected_goal_involvements_per_90 || '0')
    attackContrib = csRate * 6 + xGI90 * 6
  } else if (p.element_type === 3) {
    // MID: attacking output, small CS bonus (mids earn CS points too)
    const xG90    = parseFloat(p.expected_goals_per_90 || '0')
    const xA90    = parseFloat(p.expected_assists_per_90 || '0')
    const csRate  = (p.clean_sheets ?? 0) / gamesPlayed
    attackContrib = xG90 * 5 + xA90 * 3 + csRate * 1
  } else {
    // FWD: goals-first, assist bonus
    const xG90    = parseFloat(p.expected_goals_per_90 || '0')
    const xA90    = parseFloat(p.expected_assists_per_90 || '0')
    attackContrib = xG90 * 6 + xA90 * 2.5
  }

  return attackContrib * fixtureEase * avail * formNudge
}

/**
 * Pick the optimal starting XI from 15 squad players for the next GW.
 * Rules: 1 GK, min 3 DEF / 2 MID / 1 FWD, max 5 DEF / 5 MID / 3 FWD.
 * Optimises for playerScore (form × fixture ease × availability).
 */
export function recommendStartingXI(squad: SquadPlayer[]): SquadPlayer[] {
  const scored = squad.map((p) => ({ p, score: playerScore(p) }))
                      .sort((a, b) => b.score - a.score)

  // Best GK
  const gkEntry = scored.find((x) => x.p.element_type === 1)
  if (!gkEntry) return squad.slice(0, 11)   // fallback

  const chosen: SquadPlayer[] = [gkEntry.p]
  const remaining = scored.filter((x) => x.p.element_type !== 1)

  const counts: Record<number, number> = { 2: 0, 3: 0, 4: 0 }
  const mins:   Record<number, number> = { 2: 3, 3: 2, 4: 1 }
  const maxs:   Record<number, number> = { 2: 5, 3: 5, 4: 3 }

  // Pass 1 — satisfy minimums with the best available at each position
  for (const posType of [2, 3, 4]) {
    const posPlayers = remaining.filter((x) => x.p.element_type === posType)
    for (let i = 0; i < mins[posType] && i < posPlayers.length; i++) {
      chosen.push(posPlayers[i].p)
      counts[posType]++
    }
  }

  // Pass 2 — fill the remaining 4 spots with highest-scoring players, respecting maxs
  const chosenIds = new Set(chosen.map((p) => p.id))
  const flex = remaining.filter((x) => !chosenIds.has(x.p.id))

  for (const { p } of flex) {
    if (chosen.length >= 11) break
    if (counts[p.element_type] < maxs[p.element_type]) {
      chosen.push(p)
      counts[p.element_type]++
    }
  }

  return chosen
}

// ── Power Rating & GW Score ───────────────────────────────────

/**
 * Player Power Rating (1–99) — intrinsic quality, fixture-agnostic.
 * Answers: "how good is this player based on what they've been doing this season?"
 *
 * Normalised against realistic PL ceilings per position so the scale is
 * consistent across roles. Players with < 3 games blend towards 40 (unknown)
 * rather than crashing to zero. Availability applies a soft cap.
 */
export function playerPowerRating(p: SquadPlayer): number {
  const gamesPlayed = (p.minutes ?? 0) / 90
  const hasData     = gamesPlayed >= 3
  // Confidence: ramps to 1.0 at 15 games (~half season). Below that we blend
  // the raw score towards a neutral 40 so new/returning players aren't over-rated.
  const confidence  = Math.min(gamesPlayed / 15, 1)

  const ppg   = parseFloat(p.points_per_game || '0')
  const form  = parseFloat(p.form || '0')
  const xG90  = parseFloat(p.expected_goals_per_90 || '0')
  const xA90  = parseFloat(p.expected_assists_per_90 || '0')
  const xGI90 = parseFloat(p.expected_goal_involvements_per_90 || '0')

  // Clamp helper: normalises a value against a ceiling → [0, 1]
  const norm = (val: number, ceiling: number) => Math.min(val / ceiling, 1)

  let raw: number

  if (p.element_type === 1) {
    // GK: saves per 90 + clean sheet rate + PPG
    // Ceilings: elite GK ≈ 4.5 saves/90, 0.45 CS rate, 6.0 PPG
    const savesP90 = hasData ? (p.saves ?? 0) / gamesPlayed : 2.5
    const csRate   = hasData ? (p.clean_sheets ?? 0) / gamesPlayed : 0.3
    raw = norm(savesP90, 4.5) * 35 + norm(csRate, 0.45) * 35 + norm(ppg, 6) * 30

  } else if (p.element_type === 2) {
    // DEF: clean sheet rate dominant, xGI bonus for attacking defenders, PPG
    // Ceilings: 0.45 CS rate, 0.20 xGI/90, 6.0 PPG
    const csRate = hasData ? (p.clean_sheets ?? 0) / gamesPlayed : 0.3
    raw = norm(csRate, 0.45) * 40 + norm(xGI90, 0.20) * 30 + norm(ppg, 6) * 30

  } else if (p.element_type === 3) {
    // MID: balanced goals + assists, PPG, small form signal
    // Ceilings: 0.35 xG/90, 0.35 xA/90, 8.0 PPG, 10 form
    raw = norm(xG90, 0.35) * 25 + norm(xA90, 0.35) * 25 + norm(ppg, 8) * 35 + norm(form, 10) * 15

  } else {
    // FWD: goals dominant, xA bonus, PPG, small form signal
    // Ceilings: 0.65 xG/90, 0.30 xA/90, 8.0 PPG, 10 form
    raw = norm(xG90, 0.65) * 40 + norm(xA90, 0.30) * 20 + norm(ppg, 8) * 30 + norm(form, 10) * 10
  }

  // Blend towards 40 (neutral/unknown) when minutes are low
  const withConfidence = raw * confidence + 40 * (1 - confidence)

  // Availability soft cap — injured players can't be rated at full power
  const availCap =
    p.status === 'a'                                    ? 1.00 :
    (p.chance_of_playing_next_round ?? 0) >= 75         ? 0.92 :
    (p.chance_of_playing_next_round ?? 0) >= 50         ? 0.80 : 0.65

  return Math.round(Math.min(99, Math.max(1, withConfidence * availCap)))
}

/**
 * Player GW Score (1–99) — power rating adjusted for the upcoming fixture.
 * Answers: "how well positioned is this player for the next gameweek?"
 *
 * Fixture multiplier: dFDR 1 (easiest) = ×1.25, dFDR 3 (neutral) = ×1.0,
 * dFDR 5 (hardest) = ×0.75. BGW (no fixture) = ×0.5.
 */
export function playerGWScore(p: SquadPlayer): number {
  const power = playerPowerRating(p)
  if (!p.fixtures[0]) return Math.round(power * 0.5)   // blank gameweek
  const dFdr   = p.fixtures[0].dDifficulty ?? p.fixtures[0].difficulty
  // Soft multiplier centred at dFDR 3: range 0.75 – 1.25
  const fixMult = 0.75 + ((5 - dFdr) / 4) * 0.5
  return Math.round(Math.min(99, Math.max(1, power * fixMult)))
}

/** Colour class for a power / GW score badge */
export function powerColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800'
  if (score >= 65) return 'bg-lime-100 text-lime-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  if (score >= 35) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

/** Squad-level aggregates for the starting XI */
export function squadPowerStats(squad: SquadPlayer[]): {
  squadPower: number     // avg power of all 15
  xiPower: number        // avg power of starting 11
  xiGWScore: number      // avg GW score of starting 11
} {
  const starting = squad.slice(0, 11)
  const xiPower    = Math.round(starting.reduce((s, p) => s + playerPowerRating(p), 0) / 11)
  const xiGWScore  = Math.round(starting.reduce((s, p) => s + playerGWScore(p), 0) / 11)
  const squadPower = Math.round(squad.reduce((s, p) => s + playerPowerRating(p), 0) / squad.length)
  return { squadPower, xiPower, xiGWScore }
}

// ── Chip Squad (Wildcard / Free Hit) ─────────────────────────

/**
 * Enrich ALL bootstrap players into SquadPlayer shape so scoring
 * functions (playerPowerRating, playerGWScore) can run on them.
 * Excludes permanently unavailable players (status 'u' or 'n' with 0 minutes).
 */
export function enrichAllPlayers(state: AppState): SquadPlayer[] {
  const { bootstrap, fixtureMap, teamMap, nextGWs } = state
  return bootstrap.elements
    .filter((el) => el.status !== 'u' || el.minutes > 0)
    .map((el) => {
      const fix = (fixtureMap[el.team] ?? [])
        .filter((f) => nextGWs.includes(f.gw))
        .slice(0, 5)
      const avgFdr3  = fix.slice(0, 3).reduce((s, f) => s + f.difficulty, 0) / Math.max(fix.slice(0, 3).length, 1) || 5
      const avgDFdr3 = fix.slice(0, 3).reduce((s, f) => s + (f.dDifficulty ?? f.difficulty), 0) / Math.max(fix.slice(0, 3).length, 1) || 5
      return {
        ...el,
        pick:      { element: el.id, position: 0, is_captain: false, is_vice_captain: false, multiplier: 1 },
        teamShort: teamMap[el.team]?.short_name ?? '?',
        teamFull:  teamMap[el.team]?.name ?? '?',
        fixtures:  fix,
        avgFdr3,
        avgDFdr3,
      }
    })
}

/**
 * Build an optimal 15-player chip squad within budget.
 *
 * Free Hit  → ranked by GW Score (optimise for this week only)
 * Wildcard  → ranked by Power Rating × avg fixture ease next 3 GWs (long-term quality)
 *
 * Constraints: 2 GK / 5 DEF / 5 MID / 3 FWD, max 3 per club, within budget.
 * Uses a budget-safe greedy: when considering each player, ensure enough budget
 * remains to fill all still-empty slots with their cheapest alternatives.
 */
export function buildChipSquad(
  state: AppState,
  budget: number,          // raw FPL units (tenths of £m), e.g. 1000 = £100m
  mode: 'wildcard' | 'freehit'
): SquadPlayer[] {
  const all = enrichAllPlayers(state)

  const scorePlayer = (p: SquadPlayer): number =>
    mode === 'freehit'
      ? playerGWScore(p)
      : playerPowerRating(p) * ((6 - p.avgDFdr3) / 5)

  const scored = all
    .map((p) => ({ p, score: scorePlayer(p) }))
    .sort((a, b) => b.score - a.score)

  const slots:  Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 }
  const filled: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const clubCount: Record<number, number> = {}
  const chosen: SquadPlayer[] = []
  let spent = 0

  // Cheapest available player per position (budget safety floor)
  const minCost: Record<number, number> = {}
  for (const type of [1, 2, 3, 4]) {
    const prices = all.filter((p) => p.element_type === type).map((p) => p.now_cost)
    minCost[type] = Math.min(...prices, 40)
  }

  for (const { p } of scored) {
    if (chosen.length >= 15) break

    const type = p.element_type
    if (filled[type] >= slots[type]) continue
    if ((clubCount[p.team] ?? 0) >= 3) continue

    // Compute minimum cost to fill all remaining slots AFTER this pick
    let minAfter = 0
    for (const t of [1, 2, 3, 4]) {
      const needed = slots[t] - filled[t] - (t === type ? 1 : 0)
      if (needed > 0) minAfter += minCost[t] * needed
    }
    if (budget - spent - p.now_cost < minAfter) continue

    chosen.push(p)
    filled[type]++
    clubCount[p.team] = (clubCount[p.team] ?? 0) + 1
    spent += p.now_cost
  }

  return chosen
}

export function fdrColor(diff: number): string {
  if (diff <= 2) return 'bg-green-100 text-green-800'
  if (diff < 3.5) return 'bg-yellow-100 text-yellow-800'
  if (diff < 4.5) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

/** Returns inline background/foreground for FDR (used in SVG overlays) */
export function fdrInlineStyle(diff: number): { bg: string; fg: string } {
  if (diff <= 2)   return { bg: '#bbf7d0', fg: '#166534' }
  if (diff < 3.5)  return { bg: '#fef08a', fg: '#854d0e' }
  if (diff < 4.5)  return { bg: '#fed7aa', fg: '#9a3412' }
  return               { bg: '#fecaca', fg: '#991b1b' }
}

export function statusColor(status: string): string {
  if (status === 'a') return 'bg-green-500'
  if (status === 'd') return 'bg-yellow-400'
  return 'bg-red-500'
}
