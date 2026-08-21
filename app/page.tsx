'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/components/AppProvider'
import SummaryBar from '@/components/SummaryBar'
import SquadRatingCard from '@/components/SquadRatingCard'
import { computePLTable } from '@/components/standings'
import { enrichAllPlayers, fmt, posLabel, powerColor, playerPowerRating } from '@/lib/fpl'
import type { AppState, FPLFixture, SquadPlayer } from '@/lib/types'

function CardHeader({ title }: { title: string }) {
  return <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">{title}</p>
}

function CardFooter({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-4 pt-3 border-t border-gray-100 text-[12px] font-semibold text-green-600 hover:text-green-700 no-underline text-center"
    >
      {label}
    </Link>
  )
}

function MiniPLTableCard({ state }: { state: AppState }) {
  const table = computePLTable(state)
  const allZero = table.length > 0 && table.every((r) => r.played === 0)
  const rows = allZero
    ? [...table].sort((a, b) => a.team.short_name.localeCompare(b.team.short_name)).slice(0, 10)
    : table.slice(0, 10)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Premier League Table" />
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
            {rows.map((row, i) => (
              <tr key={row.team.id} className="border-b border-gray-50 last:border-none">
                <td className="py-1.5 pr-2 text-xs font-bold text-gray-400">{i + 1}</td>
                <td className="py-1.5 pr-2 font-semibold text-gray-900 text-[13px] leading-tight">{row.team.short_name}</td>
                <td className="py-1.5 pr-2 text-center text-xs text-gray-500">{row.played}</td>
                <td className="py-1.5 pr-2 text-center text-xs text-gray-500">{row.won}</td>
                <td className="py-1.5 pr-2 text-center text-xs text-gray-500">{row.drawn}</td>
                <td className="py-1.5 pr-2 text-center text-xs text-gray-500">{row.lost}</td>
                <td className="py-1.5 pr-2 text-center text-xs font-semibold text-gray-700">{row.gd}</td>
                <td className="py-1.5 text-center text-xs font-extrabold text-gray-900">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allZero && <p className="mt-3 text-[11px] text-gray-400">Season starts GW1</p>}
      <CardFooter href="/standings" label="See full table" />
    </div>
  )
}

type PlayerMetric = 'points' | 'power' | 'ppm'

const METRIC_CONFIG: Record<
  PlayerMetric,
  { title: string; badge: (v: number) => string; display: (v: number) => string }
> = {
  points: {
    title: 'Top Points',
    badge: () => 'bg-indigo-100 text-indigo-800',
    display: (v) => String(Math.round(v)),
  },
  power: {
    title: 'Top Power (PWR)',
    badge: (v) => powerColor(v),
    display: (v) => String(v),
  },
  ppm: {
    title: 'Top Value (PPM)',
    badge: () => 'bg-cyan-100 text-cyan-800',
    display: (v) => v.toFixed(1),
  },
}

function PlayerListCard({ state, metric }: { state: AppState; metric: PlayerMetric }) {
  const cfg = METRIC_CONFIG[metric]
  const players = useMemo(() => {
    return enrichAllPlayers(state)
      .map((p) => {
        const power = playerPowerRating(p)
        const ppm = p.now_cost > 0 ? p.total_points / (p.now_cost / 10) : 0
        const value = metric === 'points' ? p.total_points : metric === 'power' ? power : ppm
        return { player: p, value }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [state, metric])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title={cfg.title} />
      {players.length === 0 ? (
        <p className="text-sm text-gray-500">No player data yet.</p>
      ) : (
        <div className="flex flex-col">
          {players.map(({ player, value }, i) => (
            <div key={player.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-none">
              <span className="w-4 text-[11px] font-bold text-gray-400 shrink-0 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{player.web_name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {player.teamShort} / {posLabel(player.element_type)}
                </p>
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${cfg.badge(value)}`}>
                {cfg.display(value)}
              </span>
              <span className="text-[11px] font-semibold text-gray-600 shrink-0 w-12 text-right">{fmt(player.now_cost)}</span>
            </div>
          ))}
        </div>
      )}
      <CardFooter href="/players" label="View all players" />
    </div>
  )
}

function TopPlayersScouting({ state }: { state: AppState }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PlayerListCard state={state} metric="points" />
      <PlayerListCard state={state} metric="power" />
      <PlayerListCard state={state} metric="ppm" />
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
      <CardHeader title="Upcoming Fixtures" />
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
              <div key={f.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-none">
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
      <CardFooter href="/fixtures" label="View all fixtures" />
    </div>
  )
}

function CaptainBenchStrip({ state }: { state: AppState }) {
  const squad = state.squad
  if (squad.length === 0) return null

  const captain = squad.find((p) => p.pick.is_captain)
  const vice = squad.find((p) => p.pick.is_vice_captain)
  const benchPts = state.picks?.entry_history?.points_on_bench ?? 0

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xs flex flex-wrap items-center gap-x-5 gap-y-2">
      <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 w-full sm:w-auto">This GW</p>
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-900 text-white shrink-0">C</span>
        <span className="font-bold text-gray-900">{captain?.web_name ?? '—'}</span>
        <span className="text-gray-400">×{captain?.pick.multiplier ?? 1}</span>
        {captain && <span className="text-gray-500">({captain.event_points} pts)</span>}
      </div>
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-300 text-gray-700 shrink-0">VC</span>
        <span className="font-bold text-gray-900">{vice?.web_name ?? '—'}</span>
      </div>
      <div className="ml-auto text-[13px]">
        <span className="text-gray-400">Points on bench:</span>{' '}
        <span className="font-bold text-gray-900">{benchPts} pts</span>
      </div>
    </div>
  )
}

const CHIP_META: Record<string, { label: string; total: number }> = {
  wildcard: { label: 'Wildcard', total: 2 },
  freehit: { label: 'Free Hit', total: 1 },
  bboost: { label: 'Bench Boost', total: 1 },
  '3xc': { label: 'Triple Captain', total: 1 },
}

function ChipsStatusCard({ state }: { state: AppState }) {
  const used = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of state.teamInfo.chips ?? []) {
      counts[c.name] = (counts[c.name] ?? 0) + 1
    }
    return counts
  }, [state])

  const chips = Object.entries(CHIP_META).map(([key, meta]) => {
    const usedCount = used[key] ?? 0
    return { key, label: meta.label, used: usedCount, remaining: meta.total - usedCount }
  })

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Chips Remaining" />
      {chips.every((c) => c.remaining <= 0) ? (
        <p className="text-sm text-gray-500">All chips used.</p>
      ) : (
        <div className="flex flex-col">
          {chips.map((c) => (
            <div key={c.key} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-none">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.remaining > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-[13px] font-semibold text-gray-900">{c.label}</span>
              </div>
              <span className={`text-[11px] font-bold ${c.remaining > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {c.remaining > 0 ? `${c.remaining} left` : 'Used'}
              </span>
            </div>
          ))}
        </div>
      )}
      <CardFooter href="/team" label="Manage team" />
    </div>
  )
}

function MarketMovementCard({ state }: { state: AppState }) {
  const { inTop, outTop } = useMemo(() => {
    const all = enrichAllPlayers(state)
    const inTop = [...all]
      .sort((a, b) => (b.transfers_in_event ?? 0) - (a.transfers_in_event ?? 0))
      .slice(0, 10)
    const outTop = [...all]
      .sort((a, b) => (b.transfers_out_event ?? 0) - (a.transfers_out_event ?? 0))
      .slice(0, 10)
    return { inTop, outTop }
  }, [state])

  const col = (label: string, cls: string, rows: SquadPlayer[], get: (p: SquadPlayer) => number, sign: string) => (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${cls}`}>{label}</p>
      <div className="flex flex-col">
        {rows.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-none">
            <span className="w-4 text-[11px] font-bold text-gray-400 shrink-0 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{p.web_name}</p>
              <p className="text-[11px] text-gray-400 leading-tight">{p.teamShort} / {posLabel(p.element_type)}</p>
            </div>
            <span className={`text-[11px] font-bold shrink-0 ${cls}`}>{sign}{get(p).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Market Movement" />
      <div className="grid grid-cols-2 gap-4">
        {col('Most Transferred In', 'text-green-600', inTop, (p) => p.transfers_in_event ?? 0, '+')}
        {col('Most Transferred Out', 'text-red-500', outTop, (p) => p.transfers_out_event ?? 0, '-')}
      </div>
      <CardFooter href="/players" label="View all players" />
    </div>
  )
}

function DifferentialsCard({ state }: { state: AppState }) {
  const players = useMemo(() => {
    return enrichAllPlayers(state)
      .map((p) => ({
        player: p,
        power: playerPowerRating(p),
        ownership: parseFloat(p.selected_by_percent || '0'),
      }))
      .filter((x) => x.ownership > 0 && x.ownership < 5)
      .sort((a, b) => b.power - a.power)
      .slice(0, 10)
  }, [state])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Differentials" />
      {players.length === 0 ? (
        <p className="text-sm text-gray-500">No differentials found.</p>
      ) : (
        <div className="flex flex-col">
          {players.map(({ player, power, ownership }, i) => (
            <div key={player.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-none">
              <span className="w-4 text-[11px] font-bold text-gray-400 shrink-0 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{player.web_name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{player.teamShort} / {posLabel(player.element_type)}</p>
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${powerColor(power)}`}>{power}</span>
              <span className="text-[11px] font-semibold text-gray-500 shrink-0 w-12 text-right">{ownership.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      <CardFooter href="/players" label="View all players" />
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
        <CardHeader title="Injury Report" />
        <p className="text-sm text-gray-500">No injury concerns right now.</p>
      </div>
    )
  }

  // Worst first: lowest chance of playing = most injured. No chance data (out/suspended/news) = most severe.
  const worst = [...injured]
    .sort((a, b) => (a.chance_of_playing_next_round ?? 0) - (b.chance_of_playing_next_round ?? 0))
    .slice(0, 10)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="Injury Report" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {worst.map((p, i) => (
          <div key={p.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span className="w-4 text-[10px] font-bold text-gray-400 shrink-0">{i + 1}</span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
              {posLabel(p.element_type)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-bold text-gray-800 truncate">{p.web_name}</p>
                <p className="text-[10px] text-gray-400 shrink-0">{state.teamMap[p.team]?.short_name ?? '?'}</p>
                {p.chance_of_playing_next_round != null && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      p.chance_of_playing_next_round < 50 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.chance_of_playing_next_round}%
                  </span>
                )}
              </div>
              {p.news && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{p.news}</p>}
            </div>
          </div>
        ))}
      </div>
      <CardFooter href="/injuries" label="See full report" />
    </div>
  )
}

function NewsPlaceholderCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-5 shadow-xs">
      <CardHeader title="News" />
      <p className="text-sm text-gray-500">News feed coming soon.</p>
      <CardFooter href="/news" label="View all news" />
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

      <CaptainBenchStrip state={state} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniPLTableCard state={state} />
        <UpcomingFixturesCard state={state} />
        <ChipsStatusCard state={state} />
      </div>

      <TopPlayersScouting state={state} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketMovementCard state={state} />
        <DifferentialsCard state={state} />
      </div>

      <InjuryReportCard state={state} />
      <NewsPlaceholderCard />
    </div>
  )
}
