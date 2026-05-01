export interface FPLPlayer {
  id: number
  web_name: string
  first_name: string
  second_name: string
  team: number
  element_type: number // 1=GK 2=DEF 3=MID 4=FWD
  now_cost: number
  form: string
  status: string // 'a' | 'd' | 'i' | 'u' | 's' | 'n'
  news: string
  chance_of_playing_next_round: number | null
  selected_by_percent: string
  ep_next: string
  total_points: number
  minutes: number
  points_per_game: string
  expected_goals_per_90: string
  expected_assists_per_90: string
  expected_goal_involvements_per_90: string
  clean_sheets: number
  saves: number
  goals_conceded: number
  bonus: number
}

export interface FPLTeam {
  id: number
  name: string
  short_name: string
  strength_overall_home: number
  strength_overall_away: number
  strength_attack_home: number
  strength_attack_away: number
  strength_defence_home: number
  strength_defence_away: number
}

export interface FPLEvent {
  id: number
  is_current: boolean
  is_next: boolean
  is_previous: boolean
  finished: boolean
}

export interface FPLFixture {
  id: number
  event: number | null
  team_h: number
  team_a: number
  team_h_difficulty: number
  team_a_difficulty: number
  team_h_score: number | null
  team_a_score: number | null
  finished: boolean
}

export interface FPLBootstrap {
  elements: FPLPlayer[]
  teams: FPLTeam[]
  events: FPLEvent[]
}

export interface FPLEntry {
  id: number
  player_first_name: string
  player_last_name: string
  name: string
  summary_overall_points: number
  summary_overall_rank: number
  last_deadline_value: number
  last_deadline_bank: number
}

export interface FPLPick {
  element: number
  position: number
  is_captain: boolean
  is_vice_captain: boolean
  multiplier: number
}

export interface FPLPicks {
  picks: FPLPick[]
  entry_history: {
    points: number
    total_points: number
    rank: number
    event: number
    bank: number
    value: number
  }
}

export interface UpcomingFixture {
  gw: number
  opponent: number
  is_home: boolean
  difficulty: number      // FPL static FDR
  dDifficulty?: number   // dynamic FDR from Understat (1–5, float)
}

export interface SquadPlayer extends FPLPlayer {
  pick: FPLPick
  teamShort: string
  teamFull: string
  fixtures: UpcomingFixture[]
  avgFdr3: number
  avgDFdr3: number  // dynamic FDR average
}

// ── Understat types ───────────────────────────────────────────
export interface UnderstatGame {
  h_a: 'h' | 'a'
  xG: number
  xGA: number
  scored: number
  missed: number
  result: 'w' | 'd' | 'l'
  date: string
}

export interface UnderstatTeamRaw {
  id: string
  title: string
  history: UnderstatGame[]
}

export interface UnderstatTeamStats {
  shortName: string      // FPL short_name e.g. 'ARS'
  avgXGA: number         // rolling last-6 xGA conceded per game
  avgXGF: number         // rolling last-6 xGF scored per game
  homeXGA: number
  awayXGA: number
}

export interface AppState {
  bootstrap: FPLBootstrap
  teamInfo: FPLEntry
  picks: FPLPicks
  currentGW: number
  nextGWs: number[]
  squad: SquadPlayer[]
  teamMap: Record<number, FPLTeam>
  fixtureMap: Record<number, UpcomingFixture[]>
  understat: Record<string, UnderstatTeamStats> // keyed by FPL short_name
}
