'use client'

import { useState } from 'react'
import type { AppState, SquadPlayer } from '@/lib/types'
import type { UpcomingFixture } from '@/lib/types'
import {
  detectFormation,
  pitchPosition,
  TEAM_COLORS,
  fmt,
  statusColor,
  fdrInlineStyle,
  recommendStartingXI,
  playerScore,
} from '@/lib/fpl'

interface Props {
  state: AppState
}

// ── T-Shirt SVG ───────────────────────────────────────────────
function Shirt({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
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
      <path d="M1,16 L7,27 L9,25.5 L4,15.5 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M43,16 L37,27 L35,25.5 L40,15.5 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M16,10 Q18,9 20,9.5 L19,38 Q17,38 16,37 Z" fill="rgba(255,255,255,0.08)" />
    </svg>
  )
}

// ── Fixture pill ──────────────────────────────────────────────
function FixturePill({ fix, teamMap }: { fix: UpcomingFixture; teamMap: AppState['teamMap'] }) {
  const opp  = teamMap[fix.opponent]?.short_name ?? '?'
  const ha   = fix.is_home ? 'H' : 'A'
  const diff = fix.dDifficulty ?? fix.difficulty
  const { bg, fg } = fdrInlineStyle(diff)
  return (
    <span
      className="text-[8px] font-bold rounded px-1 py-0.5 leading-none"
      style={{ background: bg, color: fg }}
    >
      {opp} {ha}
    </span>
  )
}

// ── Player on pitch ───────────────────────────────────────────
function PitchPlayer({
  player,
  teamMap,
  isCaptain,
  isVice,
  isSwapped,
}: {
  player: SquadPlayer
  teamMap: AppState['teamMap']
  isCaptain: boolean
  isVice: boolean
  isSwapped?: boolean   // highlighted if different from current pick
}) {
  const colors  = TEAM_COLORS[player.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }
  const nextFix = player.fixtures[0]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-14 h-14 ${isSwapped ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent rounded-full' : ''}`}>
        <Shirt primary={colors.primary} secondary={colors.secondary} />

        {(isCaptain || isVice) && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow ${isCaptain ? 'bg-green-500' : 'bg-gray-500'}`}>
            {isCaptain ? 'C' : 'V'}
          </span>
        )}

        {player.status !== 'a' && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor(player.status)}`} />
        )}
      </div>

      <div className="bg-black/65 backdrop-blur-sm rounded-md px-2 py-1 text-center max-w-[84px] flex flex-col items-center gap-0.5">
        <p className="text-white text-[11px] font-bold leading-none truncate w-full text-center">{player.web_name}</p>
        {nextFix
          ? <FixturePill fix={nextFix} teamMap={teamMap} />
          : <p className="text-gray-400 text-[9px] leading-none">No fix</p>
        }
        {player.chance_of_playing_next_round != null && player.chance_of_playing_next_round < 100 && (
          <span className="text-[8px] font-bold leading-none" style={{ color: player.chance_of_playing_next_round <= 25 ? '#ef4444' : '#f59e0b' }}>
            {player.chance_of_playing_next_round}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Football Pitch SVG ────────────────────────────────────────
function Pitch() {
  return (
    <svg
      viewBox="0 0 300 430"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
    >
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <rect key={i} x="0" y={i * 43} width="300" height="43"
          fill={i % 2 === 0 ? '#2d7a3e' : '#2a7339'} />
      ))}
      <rect x="18" y="16" width="264" height="398" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      <line x1="18" y1="215" x2="282" y2="215" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="38" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="2.5" fill="rgba(255,255,255,0.7)" />
      <rect x="72" y="16" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="110" y="16" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="58" r="2" fill="rgba(255,255,255,0.7)" />
      <path d="M 118,80 A 38,38 0 0,1 182,80" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="72" y="350" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="110" y="388" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="372" r="2" fill="rgba(255,255,255,0.7)" />
      <path d="M 118,350 A 38,38 0 0,0 182,350" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 18,28 A 10,10 0 0,1 28,16" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 282,28 A 10,10 0 0,0 272,16" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 18,402 A 10,10 0 0,0 28,414" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 282,402 A 10,10 0 0,1 272,414" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Bench ─────────────────────────────────────────────────────
function BenchPlayer({ player, order, dimmed }: { player: SquadPlayer; order: number; dimmed?: boolean }) {
  const colors = TEAM_COLORS[player.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }
  return (
    <div className={`flex flex-col items-center gap-1.5 flex-1 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="relative w-9 h-9 opacity-60">
        <Shirt primary={colors.primary} secondary={colors.secondary} />
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold text-gray-700 truncate max-w-[68px]">{player.web_name}</p>
        <p className="text-[9px] text-gray-400">{player.teamShort} · {fmt(player.now_cost)}</p>
      </div>
      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded px-1.5">Sub {order}</span>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function positionPlayers(players: SquadPlayer[]) {
  const byType: Record<number, SquadPlayer[]> = { 1: [], 2: [], 3: [], 4: [] }
  players.forEach((p) => { byType[p.element_type]?.push(p) })
  return players.map((p) => {
    const group = byType[p.element_type]
    const idx   = group.indexOf(p)
    const pos   = pitchPosition(p.element_type, idx, group.length)
    return { ...p, pitchX: pos.x, pitchY: pos.y }
  })
}

// ── Main ──────────────────────────────────────────────────────
export default function SquadTab({ state }: Props) {
  const [mode, setMode] = useState<'current' | 'recommended'>('current')

  // GK always first in bench
  const sortBench = (bench: typeof state.squad) => [
    ...bench.filter((p) => p.element_type === 1),
    ...bench.filter((p) => p.element_type !== 1),
  ]

  // Current squad (as picked)
  const currentStarting = state.squad.slice(0, 11)
  const currentBench    = sortBench(state.squad.slice(11))

  // Recommended XI
  const recStarting = recommendStartingXI(state.squad)
  const recBench    = sortBench(state.squad.filter((p) => !recStarting.find((r) => r.id === p.id)))

  // Recommended captain & vice = top 2 scorers in rec XI
  const recSorted    = [...recStarting].sort((a, b) => playerScore(b) - playerScore(a))
  const recCaptainId = recSorted[0]?.id
  const recViceId    = recSorted[1]?.id

  // IDs that differ between current and recommended
  const currentIds = new Set(currentStarting.map((p) => p.id))
  const recIds     = new Set(recStarting.map((p) => p.id))
  const swappedIn  = new Set([...recIds].filter((id) => !currentIds.has(id)))

  const starting  = mode === 'current' ? currentStarting : recStarting
  const bench     = mode === 'current' ? currentBench    : recBench
  const formation = detectFormation(starting)
  const positioned = positionPlayers(starting)

  return (
    <div>
      {/* Mode toggle + formation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Formation</span>
          <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-100">
            {formation}
          </span>
        </div>

        {/* Toggle */}
        <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {(['current', 'recommended'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                mode === m
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m === 'current' ? 'Current' : '⚡ Next GW'}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended mode: show swaps summary */}
      {mode === 'recommended' && swappedIn.size > 0 && (
        <div className="mb-3 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5 flex flex-col gap-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-700">Suggested changes</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {[...swappedIn].map((id) => {
              const inPlayer  = recStarting.find((p) => p.id === id)!
              const outPlayer = currentStarting.find((p) => !recIds.has(p.id) && p.element_type === inPlayer.element_type)
                             ?? currentStarting.find((p) => !recIds.has(p.id))
              return (
                <p key={id} className="text-[11px] text-yellow-800">
                  <span className="font-bold text-green-700">↑ {inPlayer.web_name}</span>
                  {outPlayer && <span className="text-yellow-600"> for {outPlayer.web_name}</span>}
                </p>
              )
            })}
          </div>
        </div>
      )}

      {/* Pitch */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-lg"
        style={{ paddingBottom: '143%' }}
      >
        <Pitch />
        {positioned.map((p) => {
          const isCaptain = mode === 'current' ? p.pick.is_captain    : p.id === recCaptainId
          const isVice    = mode === 'current' ? p.pick.is_vice_captain : p.id === recViceId
          const isSwapped = mode === 'recommended' && swappedIn.has(p.id)
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.pitchX}%`, top: `${p.pitchY}%` }}
            >
              <PitchPlayer
                player={p}
                teamMap={state.teamMap}
                isCaptain={isCaptain}
                isVice={isVice}
                isSwapped={isSwapped}
              />
            </div>
          )
        })}
      </div>

      {/* Bench */}
      <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-4">
          Bench {mode === 'recommended' && <span className="text-yellow-600 normal-case font-semibold">(recommended)</span>}
        </p>
        <div className="flex gap-2 justify-around">
          {bench.map((p, i) => (
            <BenchPlayer
              key={p.id}
              player={p}
              order={i + 1}
              dimmed={mode === 'recommended' && !currentBench.find((b) => b.id === p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
