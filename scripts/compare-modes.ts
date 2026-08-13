// Investigate: why do freehit (GW Score) and wildcard (Power Rating) modes produce nearly identical squads?
// Evidence-based: overlap %, score distributions, top-10 by each metric.
import { buildAppState, buildChipSquad, enrichAllPlayers, playerPowerRating, playerGWScore } from '../lib/fpl'
import type { AppState, SquadPlayer } from '../lib/types'

const ENTRY = 2002438

async function main() {
  const [bootstrap, teamInfo, fixtures] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/').then((r) => r.json()),
    fetch(`https://fantasy.premierleague.com/api/entry/${ENTRY}/`).then((r) => r.json()),
    fetch('https://fantasy.premierleague.com/api/fixtures/').then((r) => r.json()),
  ])

  const nextEv = bootstrap.events.find((e: any) => e.is_next)
  const currentGW = nextEv ? nextEv.id : (bootstrap.events.find((e: any) => e.is_current)?.id ?? 1)
  const state: AppState = buildAppState(bootstrap, teamInfo, null, fixtures, currentGW)

  const all = enrichAllPlayers(state)
  console.log(`players: ${all.length}, currentGW: ${currentGW}`)

  // ── Score distributions ──
  const powers = all.map((p) => playerPowerRating(p))
  const gwScores = all.map((p) => playerGWScore(p))
  const uniqPower = new Set(powers)
  console.log(`\npower rating: min=${Math.min(...powers)} max=${Math.max(...powers)} unique=${uniqPower.size}`)
  console.log(`  unique power values (first 20): ${[...uniqPower].sort((a, b) => a - b).slice(0, 20).join(', ')}`)
  console.log(`GW score: min=${Math.min(...gwScores)} max=${Math.max(...gwScores)} unique=${new Set(gwScores).size}`)

  // minutes > 0?
  const withMinutes = all.filter((p) => (p.minutes ?? 0) > 0)
  console.log(`players with minutes > 0: ${withMinutes.length}`)

  // ── Correlation power vs GWScore ──
  const n = all.length
  const meanPow = powers.reduce((s, v) => s + v, 0) / n
  const meanGw = gwScores.reduce((s, v) => s + v, 0) / n
  let num = 0, d1 = 0, d2 = 0
  for (let i = 0; i < n; i++) {
    num += (powers[i] - meanPow) * (gwScores[i] - meanGw)
    d1 += (powers[i] - meanPow) ** 2
    d2 += (gwScores[i] - meanGw) ** 2
  }
  console.log(`\ncorr(power, GWScore) = ${(num / Math.sqrt(d1 * d2)).toFixed(3)}`)

  // ── Build both squads, compare overlap ──
  const fh = buildChipSquad(state, 1000, 'freehit')
  const wc = buildChipSquad(state, 1000, 'wildcard')
  const fhIds = new Set(fh.map((p) => p.id))
  const wcIds = new Set(wc.map((p) => p.id))
  const overlap = fh.filter((p) => wcIds.has(p.id))
  console.log(`\nfreehit squad: ${fh.length} players, cost £${(fh.reduce((s, p) => s + p.now_cost, 0) / 10).toFixed(1)}m`)
  console.log(`wildcard squad: ${wc.length} players, cost £${(wc.reduce((s, p) => s + p.now_cost, 0) / 10).toFixed(1)}m`)
  console.log(`overlap: ${overlap.length}/15 (${((overlap.length / 15) * 100).toFixed(0)}%)`)
  console.log(`freehit-only: ${fh.filter((p) => !wcIds.has(p.id)).map((p) => p.web_name).join(', ')}`)
  console.log(`wildcard-only: ${wc.filter((p) => !fhIds.has(p.id)).map((p) => p.web_name).join(', ')}`)

  // ── Top 10 by each metric (all players) ──
  const topBy = (fn: (p: SquadPlayer) => number, label: string) => {
    const sorted = [...all].sort((a, b) => fn(b) - fn(a)).slice(0, 10)
    console.log(`\nTop 10 by ${label}:`)
    sorted.forEach((p, i) => console.log(`  ${i + 1}. ${p.web_name.padEnd(20)} pow=${playerPowerRating(p)} gw=${playerGWScore(p)} dFDR3=${p.avgDFdr3?.toFixed(1)}`))
  }
  topBy(playerPowerRating, 'Power Rating')
  topBy(playerGWScore, 'GW Score')
  topBy((p) => playerPowerRating(p) * ((6 - (p.avgDFdr3 ?? 5)) / 5), 'Wildcard score')

  // ── dFDR spread ──
  const fdr3s = all.map((p) => p.avgDFdr3 ?? 5)
  console.log(`\navgDFdr3: min=${Math.min(...fdr3s).toFixed(1)} max=${Math.max(...fdr3s).toFixed(1)} unique=${new Set(fdr3s.map((v) => v.toFixed(1))).size}`)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
