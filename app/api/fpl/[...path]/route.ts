import { NextRequest, NextResponse } from 'next/server'

const FPL_BASE = 'https://fantasy.premierleague.com/api'

/**
 * Cache TTLs (seconds) by endpoint.
 *
 * bootstrap-static — contains live GW points, updated ~every 2 min during a
 *   live gameweek. 120s is a reasonable balance: fresh enough to feel live,
 *   aggressive enough to cut function calls by ~60× vs no cache.
 *
 * fixtures — only changes when matches finish. 5 min is fine.
 *
 * entry/{id}/event/{gw}/picks — squad picks don't change after submission.
 *   10 min cache is safe and saves the most calls (4 picks fetches per load).
 *
 * entry/{id} — manager info / squad value. Changes at most once per GW. 5 min.
 */
function cacheTtl(path: string[]): number {
  const joined = path.join('/')
  if (joined === 'bootstrap-static')                          return 120   // 2 min
  if (joined === 'fixtures')                                  return 300   // 5 min
  if (joined.includes('/event/') && joined.includes('/picks')) return 600  // 10 min
  return 300                                                               // 5 min default
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = `${FPL_BASE}/${path.join('/')}/`
  const ttl = cacheTtl(path)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FPL-Helper/1.0)',
        Accept: 'application/json',
      },
      // Next.js server-side data cache — deduplicates concurrent requests
      // on the same serverless instance and respects the same TTL.
      next: { revalidate: ttl },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `FPL API returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    // s-maxage tells Vercel's Edge Network to cache the response and serve it
    // directly without invoking the function again until the TTL expires.
    // stale-while-revalidate lets the CDN serve a slightly stale response
    // while it silently refreshes in the background — keeps the UI snappy.
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach FPL API' },
      { status: 503 }
    )
  }
}
