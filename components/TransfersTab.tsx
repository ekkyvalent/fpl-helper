import type { AppState, SquadPlayer, FPLPlayer } from '@/lib/types'
import { posLabel, fmt } from '@/lib/fpl'

interface Props {
  state: AppState
}

interface Replacement extends FPLPlayer {
  avgFdr3: number
  teamShort: string
}

function getSellCandidates(state: AppState): SquadPlayer[] {
  return state.squad
    .slice(0, 11)
    .map((p) => ({ ...p, sellScore: p.avgFdr3 * 0.6 - parseFloat(p.form || '0') * 0.4 }))
    .filter((p) => p.avgFdr3 >= 3.7 || parseFloat(p.form || '0') < 2.0)
    .sort((a, b) => b.sellScore - a.sellScore)
    .slice(0, 3)
}

function getReplacements(p: SquadPlayer, state: AppState): Replacement[] {
  const budget = p.now_cost / 10 + state.teamInfo.last_deadline_bank / 10

  return state.bootstrap.elements
    .filter(
      (el) =>
        el.element_type === p.element_type &&
        el.id !== p.id &&
        el.now_cost / 10 <= budget + 0.1 &&
        el.status === 'a' &&
        parseFloat(el.form || '0') > parseFloat(p.form || '0')
    )
    .map((el) => {
      const fix = (state.fixtureMap[el.team] ?? [])
        .filter((f) => state.nextGWs.includes(f.gw))
        .slice(0, 3)
      const avgFdr3 = fix.length ? fix.reduce((s, f) => s + f.difficulty, 0) / fix.length : 5
      return { ...el, avgFdr3, teamShort: state.teamMap[el.team]?.short_name ?? '?' }
    })
    .filter((el) => el.avgFdr3 < p.avgFdr3)
    .sort((a, b) => parseFloat(b.form || '0') - parseFloat(a.form || '0'))
    .slice(0, 3)
}

export default function TransfersTab({ state }: Props) {
  const candidates = getSellCandidates(state)

  if (!candidates.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-gray-500 text-sm">Your squad looks solid — no urgent transfers needed right now.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Based on fixture difficulty &amp; current form. Extra transfers cost <strong className="text-gray-700">−4 pts</strong> each.
      </p>

      <div className="flex flex-col gap-3">
        {candidates.map((p) => {
          const reasons: string[] = []
          if (p.avgFdr3 >= 3.7) reasons.push(`Avg FDR ${p.avgFdr3.toFixed(1)} next 3 GW`)
          if (parseFloat(p.form || '0') < 2.0) reasons.push(`Low form (${parseFloat(p.form || '0').toFixed(1)})`)
          const reps = getReplacements(p, state)

          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5">
              {/* Sell header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center text-base shrink-0">
                  ⬇️
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {p.web_name}{' '}
                    <span className="font-normal text-gray-400 text-sm">{fmt(p.now_cost)}</span>
                    {' '}
                    <span className="text-xs text-gray-400">{p.teamShort} · {posLabel(p.element_type)}</span>
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">{reasons.join(' · ')}</p>
                </div>
              </div>

              {/* Replacements */}
              {reps.length > 0 ? (
                <>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                    Suggested In
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {reps.map((r) => (
                      <div
                        key={r.id}
                        className="flex-1 min-w-[130px] bg-green-50 border border-green-100 rounded-lg px-3.5 py-3"
                      >
                        <p className="font-bold text-gray-900 text-[13px]">{r.web_name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {r.teamShort} · Form {parseFloat(r.form || '0').toFixed(1)}
                        </p>
                        <p className="text-[11px] text-gray-500">Avg FDR {r.avgFdr3.toFixed(1)} next 3 GW</p>
                        <p className="text-[13px] font-bold text-green-600 mt-2">{fmt(r.now_cost)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">No affordable replacements with better fixtures found.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
