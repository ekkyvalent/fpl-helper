'use client'

import { useApp } from '@/components/AppProvider'
import { computePLTable } from '@/components/standings'

export default function StandingsPage() {
  const { state } = useApp()

  if (!state) return null

  const table = computePLTable(state)

  if (table.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm text-gray-500">Standings will appear after GW1 results.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Premier League</p>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 mt-1">Standings</h1>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-2">Team</th>
                <th className="py-2.5 px-2 text-center">P</th>
                <th className="py-2.5 px-2 text-center">W</th>
                <th className="py-2.5 px-2 text-center">D</th>
                <th className="py-2.5 px-2 text-center">L</th>
                <th className="py-2.5 px-2 text-center">GF</th>
                <th className="py-2.5 px-2 text-center">GA</th>
                <th className="py-2.5 px-2 text-center">GD</th>
                <th className="py-2.5 px-4 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => {
                const highlight = i < 4
                  ? 'bg-green-50/60'
                  : i >= 17
                    ? 'bg-red-50/60'
                    : ''
                return (
                  <tr key={row.team.id} className={`border-b border-gray-50 last:border-none ${highlight}`}>
                    <td className="py-2.5 px-4 text-xs font-bold text-gray-400">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-[13px]">{row.team.short_name}</span>
                        <span className="text-[11px] text-gray-400 truncate">{row.team.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-500">{row.played}</td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-500">{row.won}</td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-500">{row.drawn}</td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-500">{row.lost}</td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-600">{row.gf}</td>
                    <td className="py-2.5 px-2 text-center text-xs text-gray-600">{row.ga}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-semibold text-gray-700">{row.gd}</td>
                    <td className="py-2.5 px-4 text-center text-xs font-extrabold text-gray-900">{row.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
