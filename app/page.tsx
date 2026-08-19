'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'
import SummaryBar from '@/components/SummaryBar'
import SquadRatingCard from '@/components/SquadRatingCard'
import { computePLTable } from '@/components/standings'
import { enrichAllPlayers, fmt, posLabel, powerColor, playerPowerRating } from '@/lib/fpl'
import type { AppState, FPLFixture } from '@/lib/types'

function CardHeader({ title, href, linkLabel = 'More' }: { title: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">{title}</p>
      <Link href={href} className="text-[11px] font-semibold text-green-600 hover:text-green-700 no-underline">
        {linkLabel} →
      </Link>
    </div>
  )
}

function MiniPLTableCard({ state }: { state: AppState }) {
  const table = computePLTable(state)
  // Pre-season: computePLTable returns all-zero rows, so treat as empty
  if (table.length === 0 || table.every((r) => r.played === 0)) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Premier League Table</p>
        <p className="text-sm text-gray-500">Table appears once GW1 results are in.</p>
      </div>
    )
  }

  const top10 = table.slice(0, 10)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Premier League Table" href="/standings" linkLabel="Full table" />
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
            {top10.map((row, i) => (
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

function TopPlayersCard({ state }: { state: AppState }) {
  const players = useMemo(() => {
    return enrichAllPlayers(state)
      .map((p) => ({ player: p, power: playerPowerRating(p) }))
      .sort((a, b) => b.power - a.power)
      .slice(0, 10)
  }, [state])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Top Players" href="/players" />
      {players.length === 0 ? (
        <p className="text-sm text-gray-500">No player data yet.</p>
      ) : (
        <div className="flex flex-col">
          {players.map(({ player, power }, i) => (
            <div key={player.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-none">
              <span className="w-5 text-[11px] font-bold text-gray-400 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 truncate">{player.web_name}</p>
                <p className="text-[11px] text-gray-400">
                  {player.teamShort} / {posLabel(player.element_type)}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${powerColor(power)}`}>
                {power}
              </span>
              <span className="text-[11px] font-semibold text-gray-600 shrink-0">{fmt(player.now_cost)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UpcomingFixturesCard({ state }: { state: AppState }) {
  const { fixtures, dgwByEvent } = useMemo(() => {
    const all = state.bootstrap.fixtures ?? []

    // DGW detection per event, using the full season fixture list
    const teamCounts = new Map<number, Map<number, number>>()
    for (const f of all) {
      const gw = f.event
      if (gw == null) continue
      let counts = teamCounts.get(gw)
      if (!counts) {
        counts = new Map()
        teamCounts.set(gw, counts)
      }
      counts.set(f.team_h, (counts.get(f.team_h) ?? 0) + 1)
      counts.set(f.team_a, (counts.get(f.team_a) ?? 0) + 1)
    }
    const dgw = new Map<number, Set<number>>()
    for (const [gw, counts] of teamCounts) {
      const teams = new Set<number>()
      for (const [team, count] of counts) {
        if (count >= 2) teams.add(team)
      }
      dgw.set(gw, teams)
    }

    const upcoming = all
      .filter((f): f is FPLFixture & { event: number } => f.event != null && f.event >= state.currentGW)
      .sort((a, b) => (a.kickoff_time ?? '').localeCompare(b.kickoff_time ?? ''))
      .slice(0, 10)

    return { fixtures: upcoming, dgwByEvent: dgw }
  }, [state])

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
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Upcoming Fixtures" href="/fixtures" />
      {fixtures.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming fixtures found.</p>
      ) : (
        <div className="flex flex-col">
          {fixtures.map((f) => {
            const home = state.teamMap[f.team_h]?.short_name ?? '?'
            const away = state.teamMap[f.team_a]?.short_name ?? '?'
            const dgwTeams = dgwByEvent.get(f.event)
            const isDGW = dgwTeams?.has(f.team_h) || dgwTeams?.has(f.team_a)
            return (
              <div key={f.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-none">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 w-[52px] text-center">
                  GW {f.event}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] font-bold text-gray-900">
                  <span>{home}</span>
                  <span className="text-gray-400 font-normal">vs</span>
                  <span>{away}</span>
                  {isDGW && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                      DGW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 shrink-0">
                  {f.finished && f.team_h_score != null && f.team_a_score != null
                    ? `FT ${f.team_h_score}-${f.team_a_score}`
                    : formatKickoff(f.kickoff_time)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InjuryReportCard({ state }: { state: AppState }) {
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
      <CardHeader title="News" href="/news" linkLabel="More" />
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
      <TopPlayersCard state={state} />
      <UpcomingFixturesCard state={state} />
      <InjuryReportCard state={state} />
      <NewsPlaceholderCard />
    </div>
  )
}
