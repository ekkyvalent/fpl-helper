'use client'

import Link from 'next/link'
import { useApp } from '@/components/AppProvider'
import SummaryBar from '@/components/SummaryBar'
import SquadRatingCard from '@/components/SquadRatingCard'
import { computePLTable } from '@/components/standings'
import { posLabel } from '@/lib/fpl'

function MiniPLTableCard({ state }: { state: ReturnType<typeof useApp>['state'] & {} }) {
  if (!state) return null
  const table = computePLTable(state)
  // Pre-season: computePLTable always returns 20 zero-rows — treat as empty
  if (table.length === 0 || table.every((r) => r.played === 0)) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Premier League Table</p>
        <p className="text-sm text-gray-500">Table appears once GW1 results are in.</p>
      </div>
    )
  }

  const top5 = table.slice(0, 5)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Premier League Table</p>
        <Link href="/standings" className="text-[11px] font-semibold text-green-600 hover:text-green-700 no-underline">
          Full table →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2 text-center">P</th>
              <th className="py-2 pr-2 text-center">W</th>
              <th className="py-2 pr-2 text-center">D</th>
              <th className="py-2 pr-2 text-center">L</th>
              <th className="py-2 pr-2 text-center">GD</th>
              <th className="py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((row, i) => (
              <tr key={row.team.id} className="border-b border-gray-50 last:border-none">
                <td className="py-2 pr-2 text-xs font-bold text-gray-400">{i + 1}</td>
                <td className="py-2 pr-2 font-semibold text-gray-900 text-[13px]">{row.team.short_name}</td>
                <td className="py-2 pr-2 text-center text-xs text-gray-500">{row.played}</td>
                <td className="py-2 pr-2 text-center text-xs text-gray-500">{row.won}</td>
                <td className="py-2 pr-2 text-center text-xs text-gray-500">{row.drawn}</td>
                <td className="py-2 pr-2 text-center text-xs text-gray-500">{row.lost}</td>
                <td className="py-2 pr-2 text-center text-xs font-semibold text-gray-700">{row.gd}</td>
                <td className="py-2 text-center text-xs font-extrabold text-gray-900">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InjuryReportCard({ state }: { state: ReturnType<typeof useApp>['state'] & {} }) {
  if (!state) return null
  const injured = state.bootstrap.elements.filter(
    (p) =>
      (p.news && p.news.trim().length > 0) ||
      (p.chance_of_playing_next_round != null && p.chance_of_playing_next_round < 75)
  )

  if (injured.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Injury Report</p>
        <p className="text-sm text-gray-500">No injury concerns right now.</p>
      </div>
    )
  }

  const grouped = injured.reduce<Record<number, typeof injured>>((acc, p) => {
    ;(acc[p.team] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Injury Report</p>
      <div className="flex flex-col gap-3">
        {Object.entries(grouped).map(([teamId, players]) => (
          <div key={teamId}>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
              {state.teamMap[Number(teamId)]?.name ?? `Team ${teamId}`}
            </p>
            <div className="flex flex-col gap-1.5">
              {players.map((p) => (
                <div key={p.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                    {posLabel(p.element_type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-bold text-gray-800">{p.web_name}</p>
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
                    {p.news && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{p.news}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewsPlaceholderCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">News</p>
      <p className="text-sm text-gray-500">News feed coming soon.</p>
    </div>
  )
}

export default function DashboardPage() {
  const { state } = useApp()

  if (!state) return null

  const preSeason = state.squad.length === 0

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <SummaryBar state={state} />
      <SquadRatingCard state={state} />

      {preSeason && (
        <Link
          href="/team"
          className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors no-underline"
        >
          Build your squad →
        </Link>
      )}

      <MiniPLTableCard state={state} />
      <InjuryReportCard state={state} />
      <NewsPlaceholderCard />
    </div>
  )
}
