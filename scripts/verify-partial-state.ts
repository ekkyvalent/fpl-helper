// Verify partial-state crash fix: state without fixtureMap/teamMap/nextGWs
import { buildChipSquad, enrichAllPlayers } from '../lib/fpl'

async function main() {
  const bootstrap = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/').then((r) => r.json())
  const partial = { bootstrap, picks: null, entry: null } as any

  // 1. enrichAllPlayers with partial state
  try {
    const all = enrichAllPlayers(partial)
    console.log('enrichAllPlayers partial-state: OK, players =', all.length)
  } catch (e) {
    console.log('enrichAllPlayers partial-state: THROWS ->', (e as Error).message)
    process.exitCode = 1
  }

  // 2. buildChipSquad with partial state
  try {
    const squad = buildChipSquad(partial, 1000, 'freehit')
    console.log('buildChipSquad partial-state: OK, squad =', squad.length)
  } catch (e) {
    console.log('buildChipSquad partial-state: THROWS ->', (e as Error).message)
    process.exitCode = 1
  }
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
