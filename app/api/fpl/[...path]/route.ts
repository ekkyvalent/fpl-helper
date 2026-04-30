import { NextRequest, NextResponse } from 'next/server'

const FPL_BASE = 'https://fantasy.premierleague.com/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const url = `${FPL_BASE}/${path.join('/')}/`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FPL-Helper/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `FPL API returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach FPL API' },
      { status: 503 }
    )
  }
}
