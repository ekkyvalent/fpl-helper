// Debug: what does recommendStartingXI actually return per position?
import { buildAppState, buildChipSquad, recommendStartingXI } from '../lib/fpl'
import type { AppState, SquadPlayer, FPLEvent } from '../lib/types'

async function main() {
  const [bootstrap, teamInfo, fixtures] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/').then((r) => r.json()),
    fetch('https://fantasy.premierleague.com/api/entry/2002438/').then((r) => r.json()),
    fetch('https://fantasy.premierleague.com/api/fixtures/').then((r) => r.json()),
  ])
  const nextEv = bootstrap.events.find((e: FPLEvent) => e.is_next)
  const currentGW = nextEv ? nextEv.id : (bootstrap.events.find((e: FPLEvent) => e.is_current)?.id ?? 1)
  const state: AppState = buildAppState(bootstrap, teamInfo, null, fixtures, currentGW)

  const posNames: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }

  for (const mode of ['freehit', 'wildcard'] as const) {
    const squad = buildChipSquad(state, 1000, mode)
    const xi = recommendStartingXI(squad)
    const byPos: Record<number, SquadPlayer[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const p of xi) byPos[p.element_type].push(p)
    console.log(`\n== ${mode} == XI=${xi.length}`)
    for (const t of [1, 2, 3, 4]) {
      console.log(`  ${posNames[t]} (${byPos[t].length}):`, byPos[t].map((p) => `${p.web_name} £${(p.now_cost / 10).toFixed(1)}m`).join(', '))
    }
    const bench = squad.filter((p) => !xi.some((x) => x.id === p.id))
    console.log(`  BENCH (${bench.length}):`, bench.map((p) => `${p.web_name} [${posNames[p.element_type]}] £${(p.now_cost / 10).toFixed(1)}m`).join(', '))
  }
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
