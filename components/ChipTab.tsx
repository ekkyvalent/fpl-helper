'use client'

import { useState, useEffect } from 'react'
import type { AppState, SquadPlayer } from '@/lib/types'
import {
  buildChipSquad,
  enrichAllPlayers,
  recommendStartingXI,
  playerPowerRating,
  playerGWScore,
  powerColor,
  posLabel,
  fmt,
} from '@/lib/fpl'

interface Props {
  state: AppState
  onSquadChange: (squad: SquadPlayer[], label: string) => void
}

const POSITIONS = [
  { type: 1, label: 'Goalkeepers',  short: 'GK'  },
  { type: 2, label: 'Defenders',    short: 'DEF' },
  { type: 3, label: 'Midfielders',  short: 'MID' },
  { type: 4, label: 'Forwards',     short: 'FWD' },
]

// ── Player row in the recommended squad list ──────────────────
function SquadRow({ p, isBench, mode, teamMap }: {
  p: SquadPlayer
  isBench: boolean
  mode: 'wildcard' | 'freehit'
  teamMap: AppState['teamMap']
}) {
  const score   = mode === 'freehit' ? playerGWScore(p) : playerPowerRating(p)
  const nextFix = p.fixtures[0]
  const opp     = nextFix ? (teamMap[nextFix.opponent]?.short_name ?? '?') : '—'
  const ha      = nextFix?.is_home ? 'H' : 'A'

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 ${isBench ? 'opacity-55' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-gray-900 truncate">{p.web_name}</p>
        <p className="text-[10px] text-gray-400">{p.teamShort} · {posLabel(p.element_type)}</p>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${powerColor(score)}`}>
        {mode === 'freehit' ? 'GW' : 'PWR'} {score}
      </span>
      <span className="text-[10px] text-gray-400 w-12 text-right">{nextFix ? `${opp} ${ha}` : 'BGW'}</span>
      <span className="text-[11px] font-semibold text-gray-600 w-10 text-right">{fmt(p.now_cost)}</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function ChipTab({ state, onSquadChange }: Props) {
  const [mode, setMode]           = useState<'wildcard' | 'freehit'>('freehit')
  const [openPos, setOpenPos]     = useState<number | null>(2)  // DEF open by default

  const budget     = state.teamInfo.last_deadline_value + state.teamInfo.last_deadline_bank
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

  // All players enriched for pool view
  const allPlayers = enrichAllPlayers(state)
  const scorePlayer = (p: SquadPlayer) =>
    mode === 'freehit' ? playerGWScore(p) : playerPowerRating(p)

  // Push squad to pitch whenever mode changes
  useEffect(() => {
    onSquadChange(chipSquad, mode === 'freehit' ? '🎯 Free Hit' : '🃏 Wildcard')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Also push on first render
  useEffect(() => {
    onSquadChange(chipSquad, mode === 'freehit' ? '🎯 Free Hit' : '🃏 Wildcard')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">

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
              {m === 'freehit' ? '🎯 Free Hit' : '🃏 Wildcard'}
            </button>
          ))}
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold text-gray-900">{fmt(totalCost)} <span className="font-normal text-gray-400">of {fmt(budget)}</span></p>
          <p className="text-[10px] text-green-600 font-semibold">{fmt(remaining)} remaining</p>
        </div>
      </div>

      {/* ── Mode description ── */}
      <div className={`rounded-xl px-4 py-2.5 border text-xs leading-relaxed ${
        mode === 'freehit'
          ? 'bg-blue-50 border-blue-100 text-blue-700'
          : 'bg-purple-50 border-purple-100 text-purple-700'
      }`}>
        {mode === 'freehit'
          ? '🎯 Optimised for this gameweek\'s GW Score — pure short-term output. Your squad resets next week.'
          : '🃏 Optimised for Power Rating × upcoming fixture run — builds quality for the weeks ahead.'}
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

      {/* ── Recommended squad ── */}
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
                      const inChip  = chipSquad.some((c) => c.id === p.id)
                      const nextFix = p.fixtures[0]
                      const opp     = nextFix ? (state.teamMap[nextFix.opponent]?.short_name ?? '?') : '—'
                      const ha      = nextFix?.is_home ? 'H' : 'A'
                      const pwr     = playerPowerRating(p)
                      const gw      = playerGWScore(p)

                      return (
                        <div
                          key={p.id}
                          className={`grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem_3rem] gap-1 items-center px-3 py-2 border-b border-gray-50 last:border-none ${
                            inChip ? 'bg-green-50' : 'hover:bg-gray-50/50'
                          }`}
                        >
                          <span className="text-[10px] text-gray-400">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-900 truncate">{p.web_name}</p>
                            <p className="text-[9px] text-gray-400">{p.teamShort}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600 text-center">{fmt(p.now_cost)}</span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center ${powerColor(pwr)}`}>
                            {pwr}
                          </span>
                          <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center ${powerColor(gw)}`}>
                            {gw}
                          </span>
                          <span className="text-[10px] text-gray-500 text-center">
                            {nextFix ? `${opp} ${ha}` : 'BGW'}
                          </span>
                          <span className="text-center">
                            {inChip && (
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
    </div>
  )
}
