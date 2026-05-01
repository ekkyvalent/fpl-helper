import type { UnderstatTeamStats } from './types'

// Understat full team name → FPL short_name
export const UNDERSTAT_TO_FPL: Record<string, string> = {
  'Arsenal':                   'ARS',
  'Aston Villa':               'AVL',
  'Bournemouth':               'BOU',
  'Brentford':                 'BRE',
  'Brighton':                  'BHA',
  'Chelsea':                   'CHE',
  'Crystal Palace':            'CRY',
  'Everton':                   'EVE',
  'Fulham':                    'FUL',
  'Ipswich':                   'IPS',
  'Leicester':                 'LEI',
  'Liverpool':                 'LIV',
  'Manchester City':           'MCI',
  'Manchester United':         'MUN',
  'Newcastle United':          'NEW',
  'Nottingham Forest':         'NFO',
  'Southampton':               'SOU',
  'Tottenham':                 'TOT',
  'West Ham':                  'WHU',
  'Wolverhampton Wanderers':   'WOL',
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

/**
 * Compute a dynamic FDR (1.0–5.0) based on the opponent team's rolling xGA.
 *
 * Logic:
 *  - High opponent xGA conceded  → easy fixture  → low dFDR
 *  - Low  opponent xGA conceded  → hard fixture  → high dFDR
 *  - When I'm HOME the opponent is AWAY  → use opponent's awayXGA (they concede more away)
 *  - When I'm AWAY the opponent is HOME  → use opponent's homeXGA (they concede less at home)
 *
 * Normalisation: xGA range 0.5–2.5 maps to dFDR 5→1.
 * Returns undefined when Understat data is unavailable for the opponent.
 */
export function computeDynamicFdr(
  opponentShortName: string,
  isHome: boolean,            // true = MY team is playing at home
  understat: Record<string, UnderstatTeamStats>
): number | undefined {
  const stats = understat[opponentShortName]
  if (!stats) return undefined

  // Pick the relevant split: opponent is away when I'm home, home when I'm away
  const xGA = isHome
    ? (stats.awayXGA || stats.avgXGA)
    : (stats.homeXGA || stats.avgXGA)

  const raw = 1 + 4 * (2.5 - xGA) / 2.0
  return parseFloat(clamp(raw, 1, 5).toFixed(2))
}
