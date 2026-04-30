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
