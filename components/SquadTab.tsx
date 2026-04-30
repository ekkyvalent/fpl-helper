import type { AppState, SquadPlayer } from '@/lib/types'
import PlayerCard from './PlayerCard'

interface Props {
  state: AppState
}

const POSITIONS: [string, number][] = [
  ['Goalkeeper', 1],
  ['Defenders',  2],
  ['Midfielders', 3],
  ['Forwards',   4],
]

function PositionRow({ label, players }: { label: string; players: SquadPlayer[] }) {
  if (!players.length) return null
  return (
    <div className="mb-5">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </div>
  )
}

export default function SquadTab({ state }: Props) {
  const starting = state.squad.slice(0, 11)
  const bench    = state.squad.slice(11)

  return (
    <div>
      {POSITIONS.map(([label, type]) => (
        <PositionRow
          key={type}
          label={label}
          players={starting.filter((p) => p.element_type === type)}
        />
      ))}

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Bench</p>
        <div className="flex gap-2 flex-wrap">
          {bench.map((p) => (
            <PlayerCard key={p.id} player={p} bench />
          ))}
        </div>
      </div>
    </div>
  )
}
