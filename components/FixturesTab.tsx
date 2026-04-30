import type { AppState, UpcomingFixture } from '@/lib/types'
import { posLabel, fdrColor } from '@/lib/fpl'

interface Props {
  state: AppState
}

function FixChip({ fix, teamMap }: { fix: UpcomingFixture | undefined; teamMap: AppState['teamMap'] }) {
  if (!fix) {
    return (
      <span className="inline-block px-2 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-400 min-w-[58px] text-center">
        BGW
      </span>
    )
  }
  const opp = teamMap[fix.opponent]?.short_name ?? '?'
  const ha  = fix.is_home ? 'H' : 'A'
  return (
    <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-bold min-w-[58px] text-center ${fdrColor(fix.difficulty)}`}>
      {opp} {ha}
    </span>
  )
}

export default function FixturesTab({ state }: Props) {
  const starting = state.squad.slice(0, 11)
  const { nextGWs, teamMap } = state

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Player
            </th>
            {nextGWs.map((gw) => (
              <th
                key={gw}
                className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400"
              >
                GW {gw}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {starting.map((p, i) => (
            <tr
              key={p.id}
              className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === starting.length - 1 ? 'border-none' : ''}`}
            >
              <td className="px-5 py-3">
                <p className="font-bold text-gray-900 text-[13px]">{p.web_name}</p>
                <p className="text-[11px] text-gray-400">
                  {p.teamShort} · {posLabel(p.element_type)}
                </p>
              </td>
              {nextGWs.map((gw) => (
                <td key={gw} className="px-3 py-3 text-center">
                  <FixChip fix={p.fixtures.find((f) => f.gw === gw)} teamMap={teamMap} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap">
        {[
          { label: 'Easy (FDR 1–2)', cls: 'bg-green-100 text-green-800' },
          { label: 'Medium (FDR 3)',  cls: 'bg-yellow-100 text-yellow-800' },
          { label: 'Hard (FDR 4)',    cls: 'bg-orange-100 text-orange-800' },
          { label: 'Very Hard (5)',   cls: 'bg-red-100 text-red-800' },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${cls}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
