'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppProvider'
import { posLabel } from '@/lib/fpl'

export default function InjuriesPage() {
  const { state } = useApp()

  const injured = useMemo(() => {
    if (!state) return []
    return state.bootstrap.elements
      .filter(
        (p) =>
          (p.news && p.news.trim().length > 0) ||
          (p.chance_of_playing_next_round != null && p.chance_of_playing_next_round < 75)
      )
      .sort((a, b) => (a.chance_of_playing_next_round ?? 0) - (b.chance_of_playing_next_round ?? 0))
  }, [state])

  if (!state) return null

  if (injured.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-4xl mb-3">🩹</p>
          <p className="text-sm text-gray-500">No injury concerns right now.</p>
        </div>
      </div>
    )
  }

  const grouped = injured.reduce<Record<number, typeof injured>>((acc, p) => {
    ;(acc[p.team] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Injury Report</h1>
        <p className="text-xs text-gray-400">{injured.length} players flagged</p>
      </div>

      {Object.entries(grouped).map(([teamId, players]) => (
        <div key={teamId} className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">
            {state.teamMap[Number(teamId)]?.name ?? `Team ${teamId}`}
          </p>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div key={p.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                  {posLabel(p.element_type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-gray-800">{p.web_name}</p>
                    {p.chance_of_playing_next_round != null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.chance_of_playing_next_round < 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {p.chance_of_playing_next_round}%
                      </span>
                    )}
                  </div>
                  {p.news && <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{p.news}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
