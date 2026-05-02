import type { AppState, SquadPlayer, UpcomingFixture } from '@/lib/types'
import { posLabel, playerScore, playerPowerRating, playerGWScore, powerColor, getNextGWFixtures, gwType } from '@/lib/fpl'

interface Props {
  state: AppState
}

interface ScoredPlayer extends SquadPlayer {
  score: number
  nextFix: UpcomingFixture | undefined
  ownership: number
}

const RANK_LABELS = ['⭐ Top Pick', '2nd Choice', '3rd Choice']

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[12px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  )
}

export default function CaptainTab({ state }: Props) {
  const { teamMap } = state

  const dynamic = state.squad.some((p) => p.fixtures[0]?.dDifficulty != null)

  const scored: ScoredPlayer[] = state.squad
    .slice(0, 11)
    .map((p) => {
      const nextFix = p.fixtures[0]
      // DGW players get a home bonus on their best fixture; BGW get penalised naturally via playerScore
      const homeBonus = getNextGWFixtures(p).some((f) => f.is_home) ? 1.1 : 1.0
      const score = playerScore(p) * homeBonus
      return { ...p, score, nextFix, ownership: parseFloat(p.selected_by_percent || '0') }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (!scored.length) return (
    <p className="text-center text-gray-400 py-16">No captain data available.</p>
  )

  const top       = scored[0]
  const topFixes  = getNextGWFixtures(top)
  const topGWType = gwType(top)
  const topOpp    = topFixes.map((f) => {
    const name = teamMap[f.opponent]?.short_name ?? '?'
    return `${name} (${f.is_home ? 'H' : 'A'})`
  }).join(' + ') || 'unknown'
  const topHA  = topFixes[0]?.is_home ? 'at home' : 'away'
  const ownNote = top.ownership > 30
    ? `At ${top.ownership.toFixed(0)}% ownership, this is a popular and safe captain choice.`
    : `With only ${top.ownership.toFixed(0)}% ownership, this doubles as a differential play.`

  return (
    <div>
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {scored.map((p, i) => {
          const pFixes  = getNextGWFixtures(p)
          const pGWType = gwType(p)
          const fixLabel = pFixes.length === 0
            ? 'BGW — no fixture'
            : pFixes.map((f) => `${teamMap[f.opponent]?.short_name ?? '?'} (${f.is_home ? 'H' : 'A'})`).join(' + ')
          const fdrLabel = pFixes.length === 0
            ? '—'
            : pFixes.map((f) => (dynamic && f.dDifficulty != null ? f.dDifficulty.toFixed(1) : String(f.difficulty))).join(' / ')
          const isTop = i === 0

          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl p-5 border ${isTop ? 'border-green-500 border-2' : 'border-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${isTop ? 'text-green-600' : 'text-gray-400'}`}>
                    {RANK_LABELS[i]}
                  </p>
                  {pGWType === 'dgw' && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">DGW</span>
                  )}
                  {pGWType === 'bgw' && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">BGW</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerPowerRating(p))}`}>
                    PWR {playerPowerRating(p)}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${powerColor(playerGWScore(p))}`}>
                    GW {playerGWScore(p)}
                  </span>
                </div>
              </div>
              <p className="text-[19px] font-extrabold tracking-tight text-gray-900 mb-0.5">{p.web_name}</p>
              <p className="text-xs text-gray-400 mb-4">{p.teamFull} · {posLabel(p.element_type)}</p>

              <div className="flex flex-col gap-1.5">
                <StatRow label="Form"                       value={parseFloat(p.form || '0').toFixed(1)} />
                <StatRow label={pFixes.length > 1 ? 'Fixtures' : 'Next fixture'} value={fixLabel} />
                <StatRow label={dynamic ? 'dFDR' : 'FDR'}  value={fdrLabel} />
                <StatRow label="Ownership"                  value={`${p.ownership.toFixed(1)}%`} />
                <StatRow label="xPts (next)"                value={parseFloat(p.ep_next || '0').toFixed(1)} />
              </div>

              {p.ownership < 15 && (
                <span className="inline-block mt-3 bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  ⚡ Differential
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Narrative */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Our Take</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>{top.web_name}</strong> is the standout captain pick this week —{' '}
          {topGWType === 'dgw' && <strong className="text-purple-700">Double Gameweek — </strong>}
          {topGWType === 'bgw'
            ? 'but note this is a Blank Gameweek with no fixture.'
            : <>
                playing against <strong>{topOpp}</strong>,{' '}
                with a form of <strong>{parseFloat(top.form || '0').toFixed(1)}</strong> and projected{' '}
                <strong>{parseFloat(top.ep_next || '0').toFixed(1)}</strong> expected points.{' '}
                {topGWType === 'dgw' && 'Playing twice significantly boosts their ceiling. '}
                {ownNote}
              </>
          }
        </p>
      </div>
    </div>
  )
}
