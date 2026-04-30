import type { AppState, SquadPlayer } from '@/lib/types'
import type { UpcomingFixture } from '@/lib/types'
import { detectFormation, pitchPosition, TEAM_COLORS, fmt, statusColor, fdrColor } from '@/lib/fpl'

interface Props {
  state: AppState
}

// ── T-Shirt SVG ───────────────────────────────────────────────
function Shirt({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <svg viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
      {/* Main body */}
      <path
        d="M15,4 C15,7.5 12,10.5 8,11.5 L1,16 L7,27 L13,23 L13,44 L31,44 L31,23 L37,27 L43,16 L36,11.5 C32,10.5 29,7.5 29,4 C26.5,5.5 24.5,6.5 22,6.5 C19.5,6.5 17.5,5.5 15,4 Z"
        fill={primary}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
      />
      {/* Collar */}
      <path
        d="M15,4 C16.5,6 19,7.2 22,7.2 C25,7.2 27.5,6 29,4 C27.5,3 25,2 22,2 C19,2 16.5,3 15,4 Z"
        fill={secondary}
      />
      {/* Sleeve highlights */}
      <path d="M1,16 L7,27 L9,25.5 L4,15.5 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M43,16 L37,27 L35,25.5 L40,15.5 Z" fill="rgba(255,255,255,0.12)" />
      {/* Body shine */}
      <path d="M16,10 Q18,9 20,9.5 L19,38 Q17,38 16,37 Z" fill="rgba(255,255,255,0.08)" />
    </svg>
  )
}

// ── Fixture pill (FDR color coded) ───────────────────────────
function FixturePill({ fix, teamMap }: { fix: UpcomingFixture; teamMap: AppState['teamMap'] }) {
  const opp = teamMap[fix.opponent]?.short_name ?? '?'
  const ha  = fix.is_home ? 'H' : 'A'
  // Map fdrColor class → inline style so it renders inside the pitch overlay
  const bg  = fix.difficulty <= 2 ? '#bbf7d0' : fix.difficulty === 3 ? '#fef08a' : fix.difficulty === 4 ? '#fed7aa' : '#fecaca'
  const fg  = fix.difficulty <= 2 ? '#166534' : fix.difficulty === 3 ? '#854d0e' : fix.difficulty === 4 ? '#9a3412' : '#991b1b'
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
function PitchPlayer({ player, teamMap }: { player: SquadPlayer; teamMap: AppState['teamMap'] }) {
  const colors    = TEAM_COLORS[player.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }
  const isCaptain = player.pick.is_captain
  const isVice    = player.pick.is_vice_captain
  const nextFix   = player.fixtures[0]

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Shirt + badges */}
      <div className="relative w-14 h-14">
        <Shirt primary={colors.primary} secondary={colors.secondary} />

        {/* Captain / Vice badge */}
        {(isCaptain || isVice) && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow ${isCaptain ? 'bg-green-500' : 'bg-gray-500'}`}>
            {isCaptain ? 'C' : 'V'}
          </span>
        )}

        {/* Injury dot */}
        {player.status !== 'a' && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusColor(player.status)}`} />
        )}
      </div>

      {/* Name plate */}
      <div className="bg-black/65 backdrop-blur-sm rounded-md px-2 py-1 text-center max-w-[84px] flex flex-col items-center gap-0.5">
        <p className="text-white text-[11px] font-bold leading-none truncate w-full text-center">{player.web_name}</p>
        {nextFix
          ? <FixturePill fix={nextFix} teamMap={teamMap} />
          : <p className="text-gray-400 text-[9px] leading-none">No fix</p>
        }
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
      {/* Grass stripes */}
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <rect
          key={i}
          x="0" y={i * 43} width="300" height="43"
          fill={i % 2 === 0 ? '#2d7a3e' : '#2a7339'}
        />
      ))}

      {/* Pitch border */}
      <rect x="18" y="16" width="264" height="398" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />

      {/* Halfway line */}
      <line x1="18" y1="215" x2="282" y2="215" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Centre circle */}
      <circle cx="150" cy="215" r="38" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="215" r="2.5" fill="rgba(255,255,255,0.7)" />

      {/* Top penalty area */}
      <rect x="72" y="16" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Top 6-yard box */}
      <rect x="110" y="16" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Top penalty spot */}
      <circle cx="150" cy="58" r="2" fill="rgba(255,255,255,0.7)" />
      {/* Top penalty arc */}
      <path d="M 118,80 A 38,38 0 0,1 182,80" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Bottom penalty area */}
      <rect x="72" y="350" width="156" height="64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Bottom 6-yard box */}
      <rect x="110" y="388" width="80" height="26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Bottom penalty spot */}
      <circle cx="150" cy="372" r="2" fill="rgba(255,255,255,0.7)" />
      {/* Bottom penalty arc */}
      <path d="M 118,350 A 38,38 0 0,0 182,350" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Corner arcs */}
      <path d="M 18,28 A 10,10 0 0,1 28,16" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 282,28 A 10,10 0 0,0 272,16" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 18,402 A 10,10 0 0,0 28,414" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <path d="M 282,402 A 10,10 0 0,1 272,414" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
    </svg>
  )
}

// ── Bench ─────────────────────────────────────────────────────
function BenchPlayer({ player, order }: { player: SquadPlayer; order: number }) {
  const colors = TEAM_COLORS[player.teamShort] ?? { primary: '#374151', secondary: '#FFFFFF' }

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
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

// ── Main ──────────────────────────────────────────────────────
export default function SquadTab({ state }: Props) {
  const starting = state.squad.slice(0, 11)
  const bench    = state.squad.slice(11)
  const formation = detectFormation(state.squad)

  // Group starting players by position, maintaining FPL pick order within group
  const byType: Record<number, SquadPlayer[]> = { 1: [], 2: [], 3: [], 4: [] }
  starting.forEach((p) => { byType[p.element_type]?.push(p) })

  // Build positioned players
  const positioned = starting.map((p) => {
    const group = byType[p.element_type]
    const idx   = group.indexOf(p)
    const pos   = pitchPosition(p.element_type, idx, group.length)
    return { ...p, pitchX: pos.x, pitchY: pos.y }
  })

  return (
    <div>
      {/* Formation badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Formation</span>
        <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-100">
          {formation}
        </span>
      </div>

      {/* Pitch */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-lg"
        style={{ paddingBottom: '143%' }}
      >
        <Pitch />

        {/* Players */}
        {positioned.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.pitchX}%`, top: `${p.pitchY}%` }}
          >
            <PitchPlayer player={p} teamMap={state.teamMap} />
          </div>
        ))}
      </div>

      {/* Bench */}
      <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-4">Bench</p>
        <div className="flex gap-2 justify-around">
          {bench.map((p, i) => (
            <BenchPlayer key={p.id} player={p} order={i + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
