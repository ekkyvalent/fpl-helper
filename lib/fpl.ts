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
 * Compute dynamic FDR (1–5) from FPL's own weekly-updated team strength ratings.
 * Uses opponent's defensive strength split by home/away venue.
 * Stronger defence = higher dFDR = harder fixture.
 */
function computeDynamicFdrFromStrength(
  opponent: FPLTeam,
  isHome: boolean,      // true = MY team plays at home (opponent plays away)
  allTeams: FPLTeam[]
): number {
  // Opponent is playing away when I'm home → use their away defensive strength
  // Opponent is playing at home when I'm away → use their home defensive strength
  const oppStr = isHome
    ? opponent.strength_defence_away
    : opponent.strength_defence_home

  const allStr = allTeams.map((t) =>
    isHome ? t.strength_defence_away : t.strength_defence_home
  )
  const min = Math.min(...allStr)
  const max = Math.max(...allStr)

  if (max === min) return 3  // fallback: all teams equal
  const normalised = (oppStr - min) / (max - min)
  return parseFloat((1 + 4 * normalised).toFixed(2))
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

  const fixtureMap = buildFixtureMap(fixtures)

  // Always inject dDifficulty — uses FPL's own weekly-updated strength ratings
  for (const fixes of Object.values(fixtureMap)) {
    for (const fix of fixes) {
      const opp = teamMap[fix.opponent]
      if (opp) {
        fix.dDifficulty = computeDynamicFdrFromStrength(opp, fix.is_home, allTeams)
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

/** Score a player for selection purposes: form × fixture ease × availability */
export function playerScore(p: SquadPlayer): number {
  const form     = parseFloat(p.form || '0')
  const nextDiff = p.fixtures[0]?.dDifficulty ?? p.fixtures[0]?.difficulty ?? 3
  const avail    =
    p.status === 'a'                                         ? 1.00 :
    (p.chance_of_playing_next_round ?? 0) >= 75              ? 0.75 :
    (p.chance_of_playing_next_round ?? 0) >= 50              ? 0.40 : 0.10
  return form * (6 - nextDiff) * avail
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
