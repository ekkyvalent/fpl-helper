import type { AppState } from '@/lib/types'
import { calculateSquadRating, squadPowerStats, powerColor } from '@/lib/fpl'

interface Props { state: AppState }

function ratingLabel(score: number) {
  if (score >= 85) return { text: 'Elite',      color: '#16a34a' }
  if (score >= 70) return { text: 'Strong',     color: '#22c55e' }
  if (score >= 55) return { text: 'Decent',     color: '#84cc16' }
  if (score >= 40) return { text: 'Average',    color: '#f59e0b' }
  return              { text: 'Struggling',  color: '#ef4444' }
}

// Mini horizontal bar for a score
function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

const SCORE_META = {
  squadPower: {
    label: 'Squad Power',
    icon:  '🏟️',
    desc:  'Avg quality of all 15 — reflects bench depth',
    color: '#6366f1',   // indigo
    bg:    'bg-indigo-50',
    border:'border-indigo-100',
    text:  'text-indigo-700',
    bar:   '#6366f1',
  },
  xiPower: {
    label: 'XI Power',
    icon:  '⚡',
    desc:  'Intrinsic quality of your starting XI, ignoring fixtures',
    color: '#0ea5e9',   // sky
    bg:    'bg-sky-50',
    border:'border-sky-100',
    text:  'text-sky-700',
    bar:   '#0ea5e9',
  },
  xiGWScore: {
    label: 'GW Score',
    icon:  '📅',
    desc:  'XI Power adjusted for this GW\'s fixtures — how well set up you are right now',
    color: '#16a34a',   // green
    bg:    'bg-green-50',
    border:'border-green-100',
    text:  'text-green-700',
    bar:   '#16a34a',
  },
}

export default function SquadRatingCard({ state }: Props) {
  const { score, avgForm, avgFdr, fitCount } = calculateSquadRating(state)
  const { text: ratingText, color: ratingColor } = ratingLabel(score)
  const { squadPower, xiPower, xiGWScore } = squadPowerStats(state.squad)

  const gwDelta = xiGWScore - xiPower   // negative = tough fixtures, positive = easy run

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Squad Rating</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold" style={{ color: ratingColor }}>{ratingText}</span>
          <span className="text-[11px] font-extrabold text-gray-300">·</span>
          <span className="text-[11px] font-bold text-gray-400">{score}/100</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">Form {avgForm.toFixed(1)}</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">FDR {avgFdr.toFixed(1)}</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{fitCount}/11 fit</span>
        </div>
      </div>

      {/* Three score cards */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { key: 'squadPower', value: squadPower },
            { key: 'xiPower',    value: xiPower    },
            { key: 'xiGWScore',  value: xiGWScore  },
          ] as const
        ).map(({ key, value }) => {
          const meta = SCORE_META[key]
          return (
            <div
              key={key}
              className={`rounded-xl border px-3 pt-3 pb-2.5 flex flex-col gap-0.5 ${meta.bg} ${meta.border}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{meta.icon}</span>
                <span
                  className={`text-[22px] font-extrabold leading-none ${meta.text}`}
                >
                  {value}
                </span>
              </div>
              <p className={`text-[11px] font-bold mt-1 ${meta.text}`}>{meta.label}</p>
              <p className="text-[9px] text-gray-500 leading-snug">{meta.desc}</p>
              <ScoreBar value={value} color={meta.bar} />
            </div>
          )
        })}
      </div>

      {/* GW delta hint */}
      {Math.abs(gwDelta) >= 3 && (
        <p className="text-[10px] text-gray-400 mt-2.5 text-center">
          {gwDelta < 0
            ? `⚠️ GW Score is ${Math.abs(gwDelta)} pts below XI Power — tough fixtures ahead`
            : `✅ GW Score is ${gwDelta} pts above XI Power — favourable fixtures this week`}
        </p>
      )}
    </div>
  )
}
