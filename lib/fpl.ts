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
    const el = pMap[pick.element]
    const fix = (fixtureMap[el.team] ?? [])
      .filter((f) => nextGWs.includes(f.gw))
      .slice(0, 5)
    const avgFdr3 = avg(fix.slice(0, 3).map((f) => f.difficulty)) ?? 5

    return {
      ...el,
      pick,
      teamShort: teamMap[el.team]?.short_name ?? '?',
      teamFull: teamMap[el.team]?.name ?? '?',
      fixtures: fix,
      avgFdr3,
    }
  })
}

export function buildAppState(
  bootstrap: FPLBootstrap,
  teamInfo: FPLEntry,
  picks: FPLPicks,
  fixtures: FPLFixture[],
  currentGW: number
): AppState {
  const teamMap = Object.fromEntries(bootstrap.teams.map((t) => [t.id, t]))

  const nextEv = bootstrap.events.find((e) => e.is_next)
  const startGW = nextEv ? nextEv.id : currentGW
  const nextGWs = [0, 1, 2, 3, 4].map((i) => startGW + i)

  const fixtureMap = buildFixtureMap(fixtures)
  const squad = buildSquad(bootstrap, picks, fixtureMap, teamMap, nextGWs)

  return { bootstrap, teamInfo, picks, currentGW, nextGWs, squad, teamMap, fixtureMap }
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

  // Fixtures (0–35): avg FDR of next fixture per starter
  const avgFdr = starting.reduce((s, p) => s + (p.fixtures[0]?.difficulty ?? 4), 0) / 11
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

export function fdrColor(diff: number): string {
  if (diff <= 2) return 'bg-green-100 text-green-800'
  if (diff === 3) return 'bg-yellow-100 text-yellow-800'
  if (diff === 4) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export function statusColor(status: string): string {
  if (status === 'a') return 'bg-green-500'
  if (status === 'd') return 'bg-yellow-400'
  return 'bg-red-500'
}
