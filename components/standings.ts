import type { AppState, FPLTeam } from '@/lib/types'

export interface PLTableRow {
  team: FPLTeam
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

export function computePLTable(state: AppState): PLTableRow[] {
  const teams = state.bootstrap?.teams ?? []
  const rows = new Map<number, PLTableRow>()

  for (const team of teams) {
    rows.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    })
  }

  const fixtures = state.bootstrap?.fixtures ?? []

  for (const f of fixtures) {
    if (!f.finished || f.team_h_score == null || f.team_a_score == null) continue
    const home = rows.get(f.team_h)
    const away = rows.get(f.team_a)
    if (!home || !away) continue

    home.played++
    away.played++
    home.gf += f.team_h_score
    home.ga += f.team_a_score
    away.gf += f.team_a_score
    away.ga += f.team_h_score

    if (f.team_h_score > f.team_a_score) {
      home.won++
      home.points += 3
      away.lost++
    } else if (f.team_h_score < f.team_a_score) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
    }
  }

  for (const row of rows.values()) {
    row.gd = row.gf - row.ga
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
}
