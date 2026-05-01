import type { AppState } from '@/lib/types'
import { calculateSquadRating, squadPowerStats } from '@/lib/fpl'

interface Props { state: AppState }

function scoreColor(v: number) {
  if (v >= 70) return { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
  if (v >= 55) return { text: '#65a30d', bg: '#f7fee7', border: '#d9f99d' }
  if (v >= 40) return { text: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return              { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
}

function ratingLabel(score: number) {
  if (score >= 85) return 'Elite'
  if (score >= 70) return 'Strong'
  if (score >= 55) return 'Decent'
  if (score >= 40) return 'Average'
  return 'Struggling'
}

function ScoreBlock({
  value, label, sublabel, accent,
}: {
  value: number
  label: string
  sublabel: string
  accent: { text: string; bg: string; border: string }
}) {
  return (
    <div
      className="flex-1 rounded-2xl border px-5 py-4 flex flex-col gap-1"
      style={{ background: accent.bg, borderColor: accent.border }}
    >
      <span
        className="text-5xl font-extrabold leading-none tracking-tight"
        style={{ color: accent.text }}
      >
        {value}
      </span>
      <p className="text-sm font-bold text-gray-800 mt-1">{label}</p>
      <p className="text-xs text-gray-500 leading-snug">{sublabel}</p>
      {/* progress bar */}
      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden mt-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: accent.text }}
        />
      </div>
    </div>
  )
}

export default function SquadRatingCard({ state }: Props) {
  const { avgForm, avgFdr, fitCount } = calculateSquadRating(state)
  const { xiPower, xiGWScore } = squadPowerStats(state.squad)

  const delta     = xiGWScore - xiPower
  const qColor    = scoreColor(xiPower)
  const gwColor   = scoreColor(xiGWScore)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Your Squad</p>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className="text-xs font-semibold text-gray-500">
            {ratingLabel(xiPower)}
          </span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400">Form <strong className="text-gray-600">{avgForm.toFixed(1)}</strong></span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400">FDR <strong className="text-gray-600">{avgFdr.toFixed(1)}</strong></span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400"><strong className="text-gray-600">{fitCount}/11</strong> fit</span>
        </div>
      </div>

      {/* Two big score blocks */}
      <div className="flex gap-3">
        <ScoreBlock
          value={xiPower}
          label="Team Quality"
          sublabel="How good your starting XI is, ignoring fixtures"
          accent={qColor}
        />
        <ScoreBlock
          value={xiGWScore}
          label="This GW"
          sublabel="Team Quality adjusted for this week's fixtures"
          accent={gwColor}
        />
      </div>

      {/* Delta hint */}
      {Math.abs(delta) >= 3 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {delta < 0
            ? `⚠️ This GW is ${Math.abs(delta)} pts below Team Quality — tough fixtures`
            : `✅ This GW is ${delta} pts above Team Quality — favourable fixtures`}
        </p>
      )}
    </div>
  )
}
