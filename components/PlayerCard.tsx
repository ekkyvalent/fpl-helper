import type { SquadPlayer } from '@/lib/types'
import { posLabel, fmt, statusColor } from '@/lib/fpl'

interface Props {
  player: SquadPlayer
  bench?: boolean
}

export default function PlayerCard({ player: p, bench = false }: Props) {
  const capClass = p.pick.is_captain
    ? 'border-green-500 border-2'
    : p.pick.is_vice_captain
    ? 'border-gray-400'
    : 'border-gray-100'

  return (
    <div
      className={`relative bg-white border rounded-xl px-3 py-3 flex-1 min-w-[105px] transition-shadow hover:shadow-md ${capClass} ${bench ? 'opacity-55' : ''}`}
    >
      {/* Captain / Vice badge */}
      {(p.pick.is_captain || p.pick.is_vice_captain) && (
        <span
          className={`absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black text-white ${
            p.pick.is_captain ? 'bg-green-600' : 'bg-gray-500'
          }`}
        >
          {p.pick.is_captain ? 'C' : 'V'}
        </span>
      )}

      {/* Name + status */}
      <p className="text-[13px] font-bold text-gray-900 truncate pr-5 leading-tight mb-0.5">
        <span className={`inline-block w-[6px] h-[6px] rounded-full mr-1.5 align-middle ${statusColor(p.status)}`} />
        {p.web_name}
      </p>

      {/* Team · Position */}
      <p className="text-[11px] text-gray-400 mb-2.5">
        {p.teamShort} · {posLabel(p.element_type)}
      </p>

      {/* Price + Form */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-green-600">{fmt(p.now_cost)}</span>
        <span className="text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
          F {parseFloat(p.form || '0').toFixed(1)}
        </span>
      </div>
    </div>
  )
}
