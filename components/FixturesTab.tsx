import type { AppState, UpcomingFixture } from '@/lib/types'
import { posLabel, fdrColor, fmt, playerPowerRating, playerGWScore, powerColor, getNextGWFixtures, gwType } from '@/lib/fpl'

interface Props {
  state: AppState
}

const hasDynamic = (state: AppState) =>
  state.squad.some((p) => p.fixtures[0]?.dDifficulty != null)

function FixChip({
  fix,
  teamMap,
  useDynamic,
}: {
  fix: UpcomingFixture
  teamMap: AppState['teamMap']
  useDynamic: boolean
}) {
  const opp  = teamMap[fix.opponent]?.short_name ?? '?'
  const ha   = fix.is_home ? 'H' : 'A'
  const diff = (useDynamic && fix.dDifficulty != null) ? fix.dDifficulty : fix.difficulty

  return (
    <span
      className={`inline-flex flex-col items-center px-2 py-1 rounded-md text-[11px] font-bold min-w-[58px] text-center leading-tight ${fdrColor(diff)}`}
    >
      <span>{opp} {ha}</span>
      {useDynamic && fix.dDifficulty != null && (
        <span className="text-[9px] opacity-75 font-semibold">{fix.dDifficulty.toFixed(1)}</span>
      )}
    </span>
  )
}

/** Shows one or two chips for a GW — handles BGW (none) and DGW (two) */
function GWCell({
  fixes,
  teamMap,
  useDynamic,
}: {
  fixes: UpcomingFixture[]
  teamMap: AppState['teamMap']
  useDynamic: boolean
}) {
  if (fixes.length === 0) {
    return (
      <span className="inline-block px-2 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-400 min-w-[58px] text-center">
        BGW
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-0.5 items-center">
      {fixes.map((fix, i) => (
        <FixChip key={i} fix={fix} teamMap={teamMap} useDynamic={useDynamic} />
      ))}
    </div>
  )
}

// Colour-coded form badge
function FormBadge({ form }: { form: string }) {
  const val = parseFloat(form || '0')
  const color =
    val >= 8 ? 'text-green-700 bg-green-50' :
    val >= 5 ? 'text-lime-700 bg-lime-50' :
    val >= 3 ? 'text-yellow-700 bg-yellow-50' :
               'text-red-600 bg-red-50'
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${color}`}>
      {val.toFixed(1)}
    </span>
  )
}

export default function FixturesTab({ state }: Props) {
  const starting = state.squad.slice(0, 11)
  const bench    = [
    ...state.squad.slice(11).filter((p) => p.element_type === 1),
    ...state.squad.slice(11).filter((p) => p.element_type !== 1),
  ]
  const { nextGWs, teamMap } = state
  const dynamic  = hasDynamic(state)

  return (
    <div className="overflow-x-auto">
      {dynamic && (
        <div className="flex items-center gap-2 mb-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
          <span className="text-green-600 text-sm">⚡</span>
          <p className="text-xs text-green-700 font-semibold">
            Smart FDR active — colours &amp; ratings based on FPL&apos;s weekly team strength ratings
          </p>
        </div>
      )}

      <table className="w-full bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Player
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Price
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Form
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Sel%
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              PPG
            </th>
            <th className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              PWR
            </th>
            <th className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              GW
            </th>
            {nextGWs.map((gw) => (
              <th
                key={gw}
                className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400"
              >
                GW {gw}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {starting.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              {/* Player name */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-900 text-[13px]">{p.web_name}</p>
                      {gwType(p) === 'dgw' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">DGW</span>
                      )}
                      {gwType(p) === 'bgw' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">BGW</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {p.teamShort} · {posLabel(p.element_type)}
                    </p>
                  </div>
                  {p.status !== 'a' && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: p.status === 'd' ? '#fef9c3' : '#fee2e2',
                        color:      p.status === 'd' ? '#854d0e' : '#991b1b',
                      }}
                    >
                      {p.chance_of_playing_next_round != null
                        ? `${p.chance_of_playing_next_round}%`
                        : p.status === 'd' ? '?' : 'OUT'}
                    </span>
                  )}
                </div>
              </td>

              {/* Price */}
              <td className="px-3 py-3 text-right">
                <span className="text-[12px] font-semibold text-gray-700">{fmt(p.now_cost)}</span>
              </td>

              {/* Form */}
              <td className="px-3 py-3 text-right">
                <FormBadge form={p.form} />
              </td>

              {/* Selected % */}
              <td className="px-3 py-3 text-right">
                <span className="text-[12px] text-gray-600">
                  {parseFloat(p.selected_by_percent || '0').toFixed(1)}%
                </span>
              </td>

              {/* Points per game (season avg) */}
              <td className="px-3 py-3 text-right">
                <span className="text-[12px] font-semibold text-gray-700">
                  {parseFloat(p.points_per_game || '0').toFixed(1)}
                </span>
              </td>

              {/* Power rating */}
              <td className="px-2 py-3 text-center">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerPowerRating(p))}`}>
                  {playerPowerRating(p)}
                </span>
              </td>

              {/* GW score */}
              <td className="px-2 py-3 text-center">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerGWScore(p))}`}>
                  {playerGWScore(p)}
                </span>
              </td>

              {/* GW fixture chips */}
              {nextGWs.map((gw) => (
                <td key={gw} className="px-2 py-3 text-center">
                  <GWCell
                    fixes={p.fixtures.filter((f) => f.gw === gw)}
                    teamMap={teamMap}
                    useDynamic={dynamic}
                  />
                </td>
              ))}
            </tr>
          ))}

          {/* Bench divider */}
          <tr>
            <td colSpan={7 + nextGWs.length} className="px-4 py-2 bg-gray-50 border-y border-gray-100">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Bench</span>
            </td>
          </tr>

          {bench.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors opacity-60"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-700 text-[13px]">{p.web_name}</p>
                      {gwType(p) === 'dgw' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">DGW</span>
                      )}
                      {gwType(p) === 'bgw' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">BGW</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{p.teamShort} · {posLabel(p.element_type)}</p>
                  </div>
                  {p.status !== 'a' && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: p.status === 'd' ? '#fef9c3' : '#fee2e2',
                        color:      p.status === 'd' ? '#854d0e' : '#991b1b',
                      }}
                    >
                      {p.chance_of_playing_next_round != null
                        ? `${p.chance_of_playing_next_round}%`
                        : p.status === 'd' ? '?' : 'OUT'}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-[12px] font-semibold text-gray-600">{fmt(p.now_cost)}</span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <FormBadge form={p.form} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-[12px] text-gray-500">
                  {parseFloat(p.selected_by_percent || '0').toFixed(1)}%
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-[12px] font-semibold text-gray-600">
                  {parseFloat(p.points_per_game || '0').toFixed(1)}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerPowerRating(p))}`}>
                  {playerPowerRating(p)}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerGWScore(p))}`}>
                  {playerGWScore(p)}
                </span>
              </td>
              {nextGWs.map((gw) => (
                <td key={gw} className="px-2 py-2.5 text-center">
                  <GWCell
                    fixes={p.fixtures.filter((f) => f.gw === gw)}
                    teamMap={teamMap}
                    useDynamic={dynamic}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap items-center">
        {[
          { label: 'Easy (≤2)',     cls: 'bg-green-100 text-green-800' },
          { label: 'Medium (3)',    cls: 'bg-yellow-100 text-yellow-800' },
          { label: 'Hard (4)',      cls: 'bg-orange-100 text-orange-800' },
          { label: 'Very Hard (5)', cls: 'bg-red-100 text-red-800' },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${cls}`}>
            {label}
          </span>
        ))}
        {dynamic && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">
            Numbers = smart FDR score
          </span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto">PPG = season avg pts/game</span>
      </div>
    </div>
  )
}
