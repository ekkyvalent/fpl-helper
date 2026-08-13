'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppProvider'
import { enrichAllPlayers, playerPowerRating, posLabel, fmt, fdrColor, fixtureDifficulty } from '@/lib/fpl'

export default function WatchlistPage() {
  const { state, watchlist, toggleWatch } = useApp()

  const players = useMemo(() => {
    if (!state) return []
    const all = enrichAllPlayers(state)
    const byId = new Map(all.map((p) => [p.id, p]))
    return watchlist
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)
  }, [state, watchlist])

  if (!state) return null

  if (players.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm text-gray-500">No tracked players yet — browse Players and hit Track.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Watchlist</h1>
      {players.map((p) => (
        <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{p.web_name}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {posLabel(p.element_type)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{p.teamShort} · {p.teamFull}</p>
            </div>
            <button
              onClick={() => toggleWatch(p.id)}
              className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Price</p>
              <p className="text-[13px] font-bold text-gray-800">{fmt(p.now_cost)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Form</p>
              <p className="text-[13px] font-bold text-gray-800">{parseFloat(p.form || '0').toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className="text-[13px] font-bold text-gray-800">{p.total_points}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">PWR</p>
              <p className="text-[13px] font-bold text-green-700">{playerPowerRating(p)}</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Next 3 Fixtures</p>
            <div className="flex gap-1.5 flex-wrap">
              {p.fixtures.slice(0, 3).map((f, i) => {
                const diff = f.dDifficulty ?? f.difficulty
                const opp = state.teamMap[f.opponent]?.short_name ?? '?'
                return (
                  <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded-md ${fdrColor(diff)}`}>
                    {opp} {f.is_home ? 'H' : 'A'} {diff.toFixed(1)}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
