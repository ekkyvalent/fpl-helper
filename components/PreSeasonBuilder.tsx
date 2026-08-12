'use client'

import { useState, useMemo } from 'react'
import type { AppState, SquadPlayer } from '@/lib/types'
import {
  buildChipSquad,
  enrichAllPlayers,
  recommendStartingXI,
  playerPowerRating,
  playerGWScore,
  squadPowerStats,
  powerColor,
  posLabel,
  fmt,
  getNextGWFixtures,
  gwType,
  detectFormation,
  pitchPosition,
  TEAM_COLORS,
} from '@/lib/fpl'

interface Props {
  state: AppState
}

const POSITIONS = [
  { type: 1, label: 'Goalkeepers',  short: 'GK'  },
  { type: 2, label: 'Defenders',    short: 'DEF' },
  { type: 3, label: 'Midfielders',  short: 'MID' },
  { type: 4, label: 'Forwards',     short: 'FWD' },
]

const PRE_SEASON_BUDGET = 1000 // £100m standard starting budget

// ── Shirt SVG ───────────────────────────────────────────────
function MiniShirt({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <path
        d="M15,4 C15,7.5 12,10.5 8,11.5 L1,16 L7,27 L13,23 L13,44 L31,44 L31,23 L37,27 L43,16 L36,11.5 C32,10.5 29,7.5 29,4 C26.5,5.5 24.5,6.5 22,6.5 C19.5,6.5 17.5,5.5 15,4 Z"
        fill={primary}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
      />
      <path
        d="M15,4 C16.5,6 19,7.2 22,7.2 C25,7.2 27.5,6 29,4 C27.5,3 25,2 22,2 C19,2 16.5,3 15,4 Z"
        fill={secondary}
      />
    </svg>
  )
}

// ── Player row in recommended squad ─────────────────────────
function SquadRow({ p, isBench, mode, teamMap }: {
  p: SquadPlayer
  isBench: boolean
  mode: 'wildcard' | 'freehit'
  teamMap: AppState['teamMap']
}) {
  const score    = mode === 'freehit' ? playerGWScore(p) : playerPowerRating(p)
  const pFixes   = getNextGWFixtures(p)
  const pGWType  = gwType(p)
  const fixLabel = pFixes.length === 0
    ? 'BGW'
    : pFixes.map((f) => `${teamMap[f.opponent]?.short_name ?? '?'} ${f.is_home ? 'H' : 'A'}`).join('+')

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 ${isBench ? 'opacity-55' : ''}`}>
      <span className="text-[10px] text-gray-400 w-4 text-center shrink-0">
        {isBench ? '-' : undefined}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-bold text-gray-900 truncate">{p.web_name}</p>
          {pGWType === 'dgw' && <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">DGW</span>}
          {pGWType === 'bgw' && <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">BGW</span>}
        </div>
        <p className="text-[10px] text-gray-400">{p.teamShort} · {posLabel(p.element_type)}</p>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${powerColor(score)}`}>
        {mode === 'freehit' ? 'GW' : 'PWR'} {score}
      </span>
      <span className="text-[10px] text-gray-400 text-right hidden sm:inline" style={{ minWidth: '4rem' }}>{fixLabel}</span>
      <span className="text-[11px] font-semibold text-gray-600 w-10 text-right">{fmt(p.now_cost)}</span>
      {parseFloat(p.selected_by_percent) < 10 && (
        <span className="text-[8px] font-medium bg-amber-50 text-amber-700 px-1 rounded shrink-0">
          {parseFloat(p.selected_by_percent).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

// ── Football Pitch SVG (simplified) ──────────────────────────
function MiniPitch() {
  return (
    <svg viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <rect key={i} x="0" y={i * 43} width="300" height="43" fill={i % 2 === 0 ? '#2d7a3e' : '#2a7339'} />
      ))}
      <rect x="18" y="16" width="264" height="398" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <line x1="18" y1="215" x2="282" y2="215" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <circle cx="150" cy="215" r="38" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <circle cx="150" cy="215" r="2" fill="rgba(255,255,255,0.6)" />
      <rect x="72" y="16" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <rect x="110" y="16" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <rect x="72" y="350" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <rect x="110" y="388" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
    </svg>
  )
}

// ── Main ────────────────────────────────────────────────────
export default function PreSeasonBuilder({ state }: Props) {
  const [mode, setMode]       = useState<'wildcard' | 'freehit'>('freehit')
  const [openPos, setOpenPos] = useState<number | null>(2) // DEF open by default

  const budget     = PRE_SEASON_BUDGET
  const chipSquad  = buildChipSquad(state, budget, mode)
  const totalCost  = chipSquad.reduce((s, p) => s + p.now_cost, 0)
  const remaining  = budget - totalCost

  // Determine starting XI from chip squad
  const starting  = recommendStartingXI(chipSquad)
  const startIds  = new Set(starting.map((p) => p.id))
  const bench     = [
    ...chipSquad.filter((p) => !startIds.has(p.id) && p.element_type === 1),
    ...chipSquad.filter((p) => !startIds.has(p.id) && p.element_type !== 1),
  ]
  const xiCost    = starting.reduce((s, p) => s + p.now_cost, 0)
  const benchCost = totalCost - xiCost

  // All players enriched for pool view
  const allPlayers = enrichAllPlayers(state)
  const scorePlayer = (p: SquadPlayer) =>
    mode === 'freehit' ? playerGWScore(p) : playerPowerRating(p)

  // Pitch positions
  const formationStr = detectFormation(starting)
  const positioned = starting.map((p) => {
    const group = starting.filter((s) => s.element_type === p.element_type)
    const idx   = group.indexOf(p)
    const pos   = pitchPosition(p.element_type, idx, group.length)
    return { ...p, pitchX: pos.x, pitchY: pos.y }
  })

  const valuePicksByPos = useMemo(() => {
    const grouped: Record<number, { player: SquadPlayer; ppm: number }[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const p of allPlayers) {
      const ppm = p.total_points / (p.now_cost / 10)
      grouped[p.element_type].push({ player: p, ppm })
    }
    for (const pos of [1, 2, 3, 4]) {
      grouped[pos].sort((a, b) => b.ppm - a.ppm)
      grouped[pos] = grouped[pos].slice(0, 5)
    }
    return grouped
  }, [allPlayers])

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-green-600 mb-1">
          Fantasy Premier League
        </p>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
          Pre-Season Squad Builder
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Build your starting 15 for GW1 using all available players
        </p>
      </div>

      {/* ── Mode toggle + budget ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {(['freehit', 'wildcard'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                mode === m ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m === 'freehit' ? '🎯 GW Score' : '🃏 Power Rating'}
            </button>
          ))}
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold text-gray-900">{fmt(totalCost)} <span className="font-normal text-gray-400">of {fmt(budget)}</span></p>
          <p className={`text-[10px] font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over budget`}
          </p>
          <p className="text-[9px] text-gray-400">XI £{fmt(xiCost)} · Bench £{fmt(benchCost)}</p>
        </div>
      </div>

      {/* ── Mode description ── */}
      <div className={`rounded-xl px-4 py-2.5 border text-xs leading-relaxed ${
        mode === 'freehit'
          ? 'bg-blue-50 border-blue-100 text-blue-700'
          : 'bg-purple-50 border-purple-100 text-purple-700'
      }`}>
        {mode === 'freehit'
          ? '🎯 Optimised for this gameweek\'s GW Score — pure short-term output. Picks the best XI for GW1 fixtures.'
          : '🃏 Optimised for Power Rating × upcoming fixture run — builds quality for sustained performance.'}
      </div>

      {/* ── Budget bar ── */}
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
          <span className="font-bold uppercase tracking-wider">Budget used</span>
          <span>{fmt(totalCost)} / {fmt(budget)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* ── Recommended Squad Strength ── */}
      {(() => {
        const { xiPower: xp, xiGWScore: gw } = squadPowerStats(chipSquad)
        const delta = gw - xp
        function scoreColor(v: number) {
          if (v >= 70) return { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
          if (v >= 55) return { text: '#65a30d', bg: '#f7fee7', border: '#d9f99d' }
          if (v >= 40) return { text: '#d97706', bg: '#fffbeb', border: '#fde68a' }
          return              { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
        }
        const blocks = [
          { value: xp, label: 'Team Quality', sublabel: 'Average Power Rating of recommended XI', accent: scoreColor(xp) },
          { value: gw, label: 'This GW',      sublabel: 'Average GW Score adjusted for GW1 fixtures', accent: scoreColor(gw) },
        ]
        return (
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2.5">
              Recommended Squad Strength
            </p>
            <div className="flex gap-3">
              {blocks.map(({ value, label, sublabel, accent }) => (
                <div
                  key={label}
                  className="flex-1 rounded-xl border px-4 py-3 flex flex-col gap-0.5"
                  style={{ background: accent.bg, borderColor: accent.border }}
                >
                  <span className="text-4xl font-extrabold leading-none tracking-tight" style={{ color: accent.text }}>
                    {value}
                  </span>
                  <p className="text-[13px] font-bold text-gray-800 mt-1.5">{label}</p>
                  <p className="text-[11px] text-gray-500 leading-snug">{sublabel}</p>
                  <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: accent.text }} />
                  </div>
                </div>
              ))}
            </div>
            {Math.abs(delta) >= 3 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                {delta < 0
                  ? `⚠️ This GW is ${Math.abs(delta)} pts below Team Quality — tough fixtures`
                  : `✅ This GW is ${delta} pts above Team Quality — favourable fixtures`}
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Recommended squad on Pitch Preview ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Recommended Starting XI · {formationStr}
          </p>
        </div>
        <div
          className="relative w-full aspect-square max-h-[400px] overflow-hidden shadow-lg"
        >
          <MiniPitch />
          {positioned.map((p) => {
            const colors = TEAM_COLORS[p.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }
            return (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                style={{ left: `${p.pitchX}%`, top: `${p.pitchY}%` }}
              >
                <div className="w-8 h-8">
                  <MiniShirt primary={colors.primary} secondary={colors.secondary} />
                </div>
                <div className="bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-center max-w-[72px]">
                  <p className="text-white text-[10px] font-bold leading-tight truncate">{p.web_name}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Bench below pitch ── */}
        <div className="border-t border-gray-100">
          <div className="px-4 py-1.5 bg-gray-50/80">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">Subs</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3">
            {bench.map((p) => {
              const colors = TEAM_COLORS[p.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }
              const score = mode === 'freehit' ? playerGWScore(p) : playerPowerRating(p)
              return (
                <div key={p.id} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 shrink-0">
                    <MiniShirt primary={colors.primary} secondary={colors.secondary} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-gray-900 truncate leading-tight">{p.web_name}</p>
                    <p className="text-[9px] text-gray-400">{posLabel(p.element_type)} · {p.teamShort}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${powerColor(score)}`}>
                    {score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Recommended squad (Starting XI + Bench) ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Recommended Squad
          </p>
          <p className="text-[10px] text-gray-400">
            Ranked by {mode === 'freehit' ? 'GW Score' : 'Power'}
          </p>
        </div>

        <div className="divide-y divide-gray-50">
          {starting.map((p) => (
            <SquadRow key={p.id} p={p} isBench={false} mode={mode} teamMap={state.teamMap} />
          ))}
        </div>

        <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">Bench</span>
        </div>

        <div className="divide-y divide-gray-50">
          {bench.map((p) => (
            <SquadRow key={p.id} p={p} isBench={true} mode={mode} teamMap={state.teamMap} />
          ))}
        </div>
      </div>

      {/* ── Player pool by position ── */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
          Player Pool — ranked by {mode === 'freehit' ? 'GW Score' : 'Power Rating'}
        </p>

        <div className="flex flex-col gap-2">
          {POSITIONS.map(({ type, label }) => {
            const players = allPlayers
              .filter((p) => p.element_type === type)
              .sort((a, b) => scorePlayer(b) - scorePlayer(a))
              .slice(0, 20)
            const isOpen = openPos === type

            return (
              <div key={type} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenPos(isOpen ? null : type)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-gray-700">{label}</span>
                    <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">
                      {players.length} players
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Header */}
                    <div className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem_3rem] gap-1 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                      {['#', 'Player', '£', 'PWR', 'GW', 'Next', ''].map((h) => (
                        <span key={h} className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 text-center first:text-left">
                          {h}
                        </span>
                      ))}
                    </div>

                    {players.map((p, i) => {
                      const inSquad  = chipSquad.some((c) => c.id === p.id)
                      const pFixes   = getNextGWFixtures(p)
                      const pGWType  = gwType(p)
                      const fixLabel = pFixes.length === 0
                        ? 'BGW'
                        : pFixes.map((f) => `${state.teamMap[f.opponent]?.short_name ?? '?'} ${f.is_home ? 'H' : 'A'}`).join('+')
                      const pwr = playerPowerRating(p)
                      const gw  = playerGWScore(p)

                      return (
                        <div
                          key={p.id}
                          className={`grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_3.5rem_3rem] gap-1 items-center px-3 py-2 border-b border-gray-50 last:border-none ${
                            inSquad ? 'bg-green-50' : 'hover:bg-gray-50/50'
                          }`}
                        >
                          <span className="text-[10px] text-gray-400">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] font-bold text-gray-900 truncate">{p.web_name}</p>
                              {pGWType === 'dgw' && <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">DGW</span>}
                              {pGWType === 'bgw' && <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">BGW</span>}
                            </div>
                            <p className="text-[9px] text-gray-400">
                              {p.teamShort}
                              {parseFloat(p.selected_by_percent) < 10 && (
                                <span className="ml-1 text-[7px] font-medium bg-amber-50 text-amber-700 px-0.5 rounded">
                                  {parseFloat(p.selected_by_percent).toFixed(1)}%
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600 text-center">{fmt(p.now_cost)}</span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center ${powerColor(pwr)}`}>
                            {pwr}
                          </span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center ${powerColor(gw)}`}>
                            {gw}
                          </span>
                          <span className="text-[10px] text-gray-500 text-center leading-tight">
                            {fixLabel}
                          </span>
                          <span className="text-center">
                            {inSquad && (
                              <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                ✓ In
                              </span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Value Picks by position ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Value Picks — top points per £m
          </p>
        </div>
        {POSITIONS.map(({ type, label }) => {
          const picks = valuePicksByPos[type]
          if (!picks.length) return null
          return (
            <div key={type} className="border-b border-gray-50 last:border-none">
              <div className="px-4 py-1.5 bg-gray-50/80">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-gray-400">{label}</span>
              </div>
              <div className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-1 items-center px-3 py-1.5 bg-gray-50/50 border-b border-gray-100">
                {['Player','£','Points','Pts/£m'].map((h) => (
                  <span key={h} className="text-[8px] font-extrabold uppercase tracking-wider text-gray-400 text-center first:text-left">{h}</span>
                ))}
              </div>
              {picks.map(({ player: p, ppm }) => (
                <div key={p.id} className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-1 items-center px-3 py-1.5 border-b border-gray-50 last:border-none">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 truncate">{p.web_name}</p>
                    <p className="text-[9px] text-gray-400">{p.teamShort}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600 text-center">{fmt(p.now_cost)}</span>
                  <span className="text-[10px] font-semibold text-gray-700 text-center">{p.total_points}</span>
                  <span className="text-[10px] font-bold text-green-700 text-center">{ppm.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
