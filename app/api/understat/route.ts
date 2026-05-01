import { NextResponse } from 'next/server'
import type { UnderstatTeamRaw, UnderstatGame, UnderstatTeamStats } from '@/lib/types'
import { UNDERSTAT_TO_FPL } from '@/lib/dynamicFdr'

const UNDERSTAT_URL = 'https://understat.com/league/EPL/2024'

/** Decode Understat's hex-escaped JSON string */
function parseHex(encoded: string): string {
  return encoded.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

/** Rolling average of the last n games for a given numeric field */
function rollingAvg(games: UnderstatGame[], field: 'xGA' | 'xG', n = 6): number {
  const recent = games.slice(-n)
  if (!recent.length) return 1.2   // neutral fallback
  return recent.reduce((sum, g) => sum + Number(g[field]), 0) / recent.length
}

export async function GET() {
  try {
    const res = await fetch(UNDERSTAT_URL, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         'https://understat.com/',
        'Cache-Control':   'no-cache',
      },
      next: { revalidate: 3600 },   // cache for 1 hour
    })

    console.log('[understat] HTTP status:', res.status)
    if (!res.ok) throw new Error(`HTTP ${res.status} from Understat`)

    const html = await res.text()
    console.log('[understat] HTML length:', html.length)

    // Understat embeds team data as:  var teamsData = JSON.parse('...')
    const match = html.match(/var teamsData\s*=\s*JSON\.parse\('(.+?)'\)/)
    if (!match) {
      console.error('[understat] teamsData pattern not found — first 500 chars:', html.slice(0, 500))
      throw new Error('teamsData not found in Understat HTML')
    }

    const decoded = parseHex(match[1])
    const raw: Record<string, UnderstatTeamRaw> = JSON.parse(decoded)

    const result: Record<string, UnderstatTeamStats> = {}

    for (const team of Object.values(raw)) {
      const fplShort = UNDERSTAT_TO_FPL[team.title]
      if (!fplShort) continue   // skip teams not in current FPL season

      const history   = team.history
      const homeGames = history.filter((g) => g.h_a === 'h')
      const awayGames = history.filter((g) => g.h_a === 'a')

      result[fplShort] = {
        shortName: fplShort,
        avgXGA:  rollingAvg(history,   'xGA'),
        avgXGF:  rollingAvg(history,   'xG'),
        homeXGA: rollingAvg(homeGames, 'xGA'),
        awayXGA: rollingAvg(awayGames, 'xGA'),
      }
    }

    console.log('[understat] teams parsed:', Object.keys(result).length)
    return NextResponse.json(result)

  } catch (err) {
    // Return empty object so the app degrades gracefully to static FDR
    console.error('[/api/understat] failed:', err)
    return NextResponse.json({})
  }
}
