'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/components/AppProvider'

interface LeagueResult {
  id: number
  entry_name: string
  player_name: string
  rank: number
  last_rank: number
  total: number
  event_total: number
  rank_sort: number
  entry: number
}

interface LeagueStandings {
  league: {
    name: string
  }
  standings: {
    results: LeagueResult[]
  }
}

function LeagueCard({ leagueId, type }: { leagueId: string; type: 'classic' | 'h2h' }) {
  const [data, setData] = useState<LeagueStandings | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const { removeLeague } = useApp()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr('')
    const base = type === 'classic' ? 'leagues-classic' : 'leagues-h2h'
    fetch(`/api/fpl/${base}/${leagueId}/standings/`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leagueId, type])

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <div className="w-6 h-6 border-[3px] border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (err) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-bold text-gray-700">League {leagueId} ({type === 'classic' ? 'Classic' : 'Head-to-Head'})</p>
          <button
            onClick={() => removeLeague(leagueId, type)}
            className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Remove
          </button>
        </div>
        <p className="text-sm text-red-500">
          Could not load league — {err}. It may be private or the ID may be invalid.
        </p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-gray-800">{data.league?.name ?? `League ${leagueId}`}</p>
        <button
          onClick={() => removeLeague(leagueId, type)}
          className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          Remove
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-2">Team</th>
              <th className="py-2.5 px-2">Manager</th>
              <th className="py-2.5 px-2 text-center">Last</th>
              <th className="py-2.5 px-2 text-center">▲▼</th>
              <th className="py-2.5 px-4 text-center">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.standings?.results?.map((r) => {
              const movement = r.last_rank - r.rank
              return (
                <tr key={r.entry} className="border-b border-gray-50 last:border-none">
                  <td className="py-2.5 px-4 text-xs font-bold text-gray-400">{r.rank}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-900 text-[13px]">{r.entry_name}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-500">{r.player_name}</td>
                  <td className="py-2.5 px-2 text-center text-xs text-gray-500">{r.last_rank || '—'}</td>
                  <td className="py-2.5 px-2 text-center text-xs font-bold">
                    {movement > 0 ? (
                      <span className="text-green-600">▲{movement}</span>
                    ) : movement < 0 ? (
                      <span className="text-red-500">▼{Math.abs(movement)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center text-xs font-extrabold text-gray-900">{r.total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function LeaguesPage() {
  const { leagues, addLeague } = useApp()
  const [id, setId] = useState('')
  const [type, setType] = useState<'classic' | 'h2h'>('classic')
  const [err, setErr] = useState('')

  function handleAdd() {
    const trimmed = id.trim()
    if (!trimmed) {
      setErr('Please enter a league ID.')
      return
    }
    setErr('')
    addLeague({ id: trimmed, type })
    setId('')
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Leagues</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Add a mini-league</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="League ID"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white text-gray-900 placeholder:text-gray-300"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'classic' | 'h2h')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 bg-white text-gray-900"
          >
            <option value="classic">Classic</option>
            <option value="h2h">Head-to-Head</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Add League
          </button>
        </div>
        {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
      </div>

      {leagues.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm text-gray-500">No leagues saved yet — add one above.</p>
        </div>
      ) : (
        leagues.map((league) => (
          <LeagueCard key={`${league.type}-${league.id}`} leagueId={league.id} type={league.type} />
        ))
      )}
    </div>
  )
}
