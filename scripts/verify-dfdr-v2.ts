// Verify dFDR v2:
//  1. Pre-season (all strength = 0) → dDifficulty falls back to static FDR, no regression.
//  2. In-season mock (strength injected) → position-aware dFDR differentiates:
//     - GK/DEF harder vs strong-ATTACK opponent
//     - FWD harder vs strong-DEFENCE opponent
//     - averaged dDifficulty sits between position extremes
import { buildAppState, fixtureDifficulty } from '../lib/fpl'
import type { AppState, FPLBootstrap, FPLTeam, FPLFixture, FPLEvent, FPLEntry, UpcomingFixture } from '../lib/types'

const ENTRY = 2002438

function cloneBootstrap(b: FPLBootstrap): FPLBootstrap {
  return {
    ...b,
    teams: b.teams.map((t) => ({ ...t })),
    elements: b.elements.map((e) => ({ ...e })),
  }
}

/** Give every team a mid-table strength, then override two extremes. */
function injectStrengths(b: FPLBootstrap): FPLBootstrap {
  for (const t of b.teams) {
    t.strength_attack_home = 65
    t.strength_attack_away = 65
    t.strength_defence_home = 65
    t.strength_defence_away = 65
  }
  const set = (short: string, patch: Partial<FPLTeam>) => {
    const t = b.teams.find((x) => x.short_name === short)
    if (t) Object.assign(t, patch)
  }
  // ARS: elite attack, leaky defence
  set('ARS', { strength_attack_home: 92, strength_attack_away: 90, strength_defence_home: 48, strength_defence_away: 46 })
  // MCI: elite defence, decent attack
  set('MCI', { strength_attack_home: 72, strength_attack_away: 70, strength_defence_home: 95, strength_defence_away: 94 })
  return b
}

function stateFor(b: FPLBootstrap, fixtures: FPLFixture[], currentGW: number): AppState {
  const teamInfo: FPLEntry = {
    id: ENTRY,
    name: 'Tester',
    player_first_name: 'T',
    player_last_name: 'T',
    summary_overall_points: 0,
    summary_overall_rank: 0,
    last_deadline_value: 0,
    last_deadline_bank: 0,
  }
  return buildAppState(b, teamInfo, null, fixtures, currentGW)
}

/** First fixture where MY team faces the given opponent short name. */
function findFixture(state: AppState, oppShort: string): { team: string; fix: UpcomingFixture } | null {
  const oppId = Object.values(state.teamMap).find((t) => t.short_name === oppShort)?.id
  if (!oppId) return null
  for (const [teamId, fixes] of Object.entries(state.fixtureMap)) {
    const fix = fixes.find((f) => f.opponent === oppId)
    if (fix) {
      return { team: state.teamMap[Number(teamId)]?.short_name ?? teamId, fix }
    }
  }
  return null
}

async function main() {
  const [bootstrapRaw, fixtures] = await Promise.all([
    fetch('https://fantasy.premierleague.com/api/bootstrap-static/').then((r) => r.json()),
    fetch('https://fantasy.premierleague.com/api/fixtures/').then((r) => r.json()),
  ])
  const nextEv = bootstrapRaw.events.find((e: FPLEvent) => e.is_next)
  const currentGW = nextEv ? nextEv.id : (bootstrapRaw.events.find((e: FPLEvent) => e.is_current)?.id ?? 1)

  let failures = 0
  const check = (cond: boolean, label: string) => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`)
    if (!cond) failures++
  }

  // ── 1. Pre-season fallback ──────────────────────────────────
  console.log('\n[1] Pre-season fallback (real data, strength = 0)')
  const realState = stateFor(bootstrapRaw, fixtures, currentGW)
  let fallbackOk = true
  let fixtureCount = 0
  for (const fixes of Object.values(realState.fixtureMap)) {
    for (const fix of fixes) {
      fixtureCount++
      if (fix.dDifficulty !== fix.difficulty) fallbackOk = false
      if (fix.dDifficultyByPos) fallbackOk = false
    }
  }
  check(fallbackOk, `dDifficulty === static difficulty on all ${fixtureCount} fixtures, no dDifficultyByPos`)
  check(realState.squad.length >= 0, 'state built')

  // ── 2. Position-aware (synthetic in-season) ─────────────────
  console.log('\n[2] Position-aware dFDR (synthetic strength data)')
  const mockState = stateFor(injectStrengths(cloneBootstrap(bootstrapRaw)), fixtures, currentGW)

  const vsARS = findFixture(mockState, 'ARS')
  const vsMCI = findFixture(mockState, 'MCI')
  if (!vsARS || !vsMCI) {
    console.log('  FAIL  could not find fixtures vs ARS / MCI')
    process.exit(1)
  }

  const fA = vsARS.fix, fB = vsMCI.fix
  console.log(`  ${vsARS.team} vs ARS (attack 90, defence 47):`)
  console.log(`    GK=${fA.dDifficultyByPos?.[1]} DEF=${fA.dDifficultyByPos?.[2]} MID=${fA.dDifficultyByPos?.[3]} FWD=${fA.dDifficultyByPos?.[4]} avg=${fA.dDifficulty?.toFixed(2)}`)
  check((fA.dDifficultyByPos?.[1] ?? 0) > (fA.dDifficultyByPos?.[4] ?? 99), 'GK dFDR > FWD dFDR vs attack-heavy ARS')
  check(Math.abs((fA.dDifficultyByPos?.[1] ?? 0) - (fA.dDifficultyByPos?.[2] ?? 0)) < 0.01, 'GK ≈ DEF')

  console.log(`  ${vsMCI.team} vs MCI (attack 71, defence 95):`)
  console.log(`    GK=${fB.dDifficultyByPos?.[1]} DEF=${fB.dDifficultyByPos?.[2]} MID=${fB.dDifficultyByPos?.[3]} FWD=${fB.dDifficultyByPos?.[4]} avg=${fB.dDifficulty?.toFixed(2)}`)
  check((fB.dDifficultyByPos?.[4] ?? 0) > (fB.dDifficultyByPos?.[1] ?? 99), 'FWD dFDR > GK dFDR vs defence-heavy MCI')

  const avgA = fA.dDifficulty ?? 0
  const posA = Object.values(fA.dDifficultyByPos ?? {})
  check(avgA >= Math.min(...posA) - 0.01 && avgA <= Math.max(...posA) + 0.01, 'averaged dDifficulty within position range')

  const gkDiff = Math.abs((fA.dDifficultyByPos?.[1] ?? 0) - (fB.dDifficultyByPos?.[1] ?? 0))
  const fwdDiff = Math.abs((fA.dDifficultyByPos?.[4] ?? 0) - (fB.dDifficultyByPos?.[4] ?? 0))
  console.log(`  spread vs the two opponents: GK swing=${gkDiff.toFixed(2)}  FWD swing=${fwdDiff.toFixed(2)}`)
  check(gkDiff > 0.2 && fwdDiff > 0.2, 'both GK and FWD dFDR respond to opponent quality')

  // ── 3. fixtureDifficulty fallback chain ─────────────────────
  console.log('\n[3] fixtureDifficulty() fallback chain')
  const posFix = fA.dDifficultyByPos
  const withoutPos: UpcomingFixture = { gw: 1, opponent: 1, is_home: true, difficulty: 3, dDifficulty: 4.2 }
  const staticOnly: UpcomingFixture = { gw: 1, opponent: 1, is_home: true, difficulty: 2.5 }
  check(fixtureDifficulty(fA, 1) === posFix?.[1], 'uses dDifficultyByPos when present')
  check(fixtureDifficulty(withoutPos, 1) === 4.2, 'falls back to dDifficulty')
  check(fixtureDifficulty(staticOnly, 1) === 2.5, 'falls back to static difficulty')
  check(fixtureDifficulty(undefined, 1) === 4, 'undefined → neutral 4')

  console.log(failures === 0 ? '\nALL CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
