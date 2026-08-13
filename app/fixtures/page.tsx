'use client'

import { useMemo } from 'react'
import { useApp } from '@/components/AppProvider'
import type { FPLFixture } from '@/lib/types'

export default function FixturesPage() {
  const { state } = useApp()

  const groups = useMemo(() => {
    if (!state) return []
    const fixtures = state.bootstrap.fixtures ?? []
    const currentGW = state.currentGW

    const grouped = new Map<number, FPLFixture[]>()
    for (const f of fixtures) {
      if (f.event == null || f.event < currentGW) continue
      if (!grouped.has(f.event)) grouped.set(f.event, [])
      grouped.get(f.event)!.push(f)
    }

    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 5)
  }, [state])

  if (!state) return null

  if (groups.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm text-gray-500">No upcoming fixtures found.</p>
        </div>
      </div>
    )
  }

  function formatKickoff(time: string | null) {
    if (!time) return 'TBD'
    const d = new Date(time)
    return d.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Fixtures</h1>
      {groups.map(([gw, fixtures]) => {
        // Detect DGW teams
        const teamCount = new Map<number, number>()
        for (const f of fixtures) {
          teamCount.set(f.team_h, (teamCount.get(f.team_h) ?? 0) + 1)
          teamCount.set(f.team_a, (teamCount.get(f.team_a) ?? 0) + 1)
        }
        const dgwTeams = new Set<number>()
        for (const [teamId, count] of teamCount) {
          if (count >= 2) dgwTeams.add(teamId)
        }

        return (
          <div key={gw} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-extrabold text-gray-800">Gameweek {gw}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {fixtures
                .sort((a, b) => (a.kickoff_time ?? '').localeCompare(b.kickoff_time ?? ''))
                .map((f) => {
                  const home = state.teamMap[f.team_h]?.short_name ?? '?'
                  const away = state.teamMap[f.team_a]?.short_name ?? '?'
                  const isDGW = dgwTeams.has(f.team_h) || dgwTeams.has(f.team_a)
                  return (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900">
                          <span>{home}</span>
                          <span className="text-gray-400 font-normal">vs</span>
                          <span>{away}</span>
                          {isDGW && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">DGW</span>
                          )}
                        </div>
                        {f.finished && f.team_h_score != null && f.team_a_score != null ? (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            FT {f.team_h_score}–{f.team_a_score}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatKickoff(f.kickoff_time)}</p>
                        )}
                      </div>
                      {!f.finished && f.kickoff_time && (
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-md px-2 py-1 shrink-0">
                          {formatKickoff(f.kickoff_time)}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
