// Full repro: build AppState via buildAppState (same as app flow), then run chip squad + starting XI
import { buildAppState, buildChipSquad, recommendStartingXI, detectFormation } from '../lib/fpl'
import type { AppState, FPLEvent } from '../lib/types'

const ENTRY = 2002438

async function main() {
  const [bootstrap, teamInfo, fixtures] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/').then((r) => r.json()),
    fetch(`https://fantasy.premierleague.com/api/entry/${ENTRY}/`).then((r) => r.json()),
    fetch('https://fantasy.premierleague.com/api/fixtures/').then((r) => r.json()),
  ])
  console.log('bootstrap:', bootstrap.elements.length, 'teams:', bootstrap.teams.length, 'fixtures:', fixtures.length)

  // same logic as page.tsx: currentGW from next event
  const nextEv = bootstrap.events.find((e: FPLEvent) => e.is_next)
  const currentGW = nextEv ? nextEv.id : (bootstrap.events.find((e: FPLEvent) => e.is_current)?.id ?? 1)
  console.log('currentGW:', currentGW)

  const state: AppState = buildAppState(bootstrap, teamInfo, null, fixtures, currentGW)
  console.log('state built. fixtureMap keys:', Object.keys(state.fixtureMap).length, 'teamMap keys:', Object.keys(state.teamMap).length)

  for (const mode of ['freehit', 'wildcard'] as const) {
    try {
      const squad = buildChipSquad(state, 1000, mode)
      const cost = squad.reduce((s, p) => s + p.now_cost, 0)
      const ids = new Set(squad.map((p) => p.id))
      const byPos: Record<number, number> = {}
      for (const p of squad) byPos[p.element_type] = (byPos[p.element_type] ?? 0) + 1
      const xi = recommendStartingXI(squad)
      console.log(`[${mode}] squad=${squad.length} cost=£${(cost / 10).toFixed(1)}m rem=£${((1000 - cost) / 10).toFixed(1)}m dupes=${squad.length - ids.size} pos=${JSON.stringify(byPos)} formation=${detectFormation(squad)} xi=${xi.length}`)
      if (squad.length < 15) console.log('  !! ERROR CONDITION: squad < 15')
      if (cost > 1000) console.log('  !! ERROR CONDITION: OVER BUDGET')
    } catch (e) {
      console.log(`[${mode}] THROWS:`, (e as Error).message)
      console.log((e as Error).stack?.split('\n').slice(0, 4).join('\n'))
    }
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
