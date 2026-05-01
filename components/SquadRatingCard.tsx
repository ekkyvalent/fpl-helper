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

// Circular arc gauge
function Gauge({ score }: { score: number }) {
  const r   = 38
  const cx  = 52
  const cy  = 52
  const circ = 2 * Math.PI * r
  // We use a 240° arc (from 150° to 390°, i.e. bottom-left → bottom-right)
  const arcLen = (240 / 360) * circ
  const filled = (score / 100) * arcLen
  const gap    = arcLen - filled

  const { color } = ratingLabel(score)

  // Helper: point on circle at angle (degrees, 0=right)
  const pt = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  })

  const start = pt(150)
  const end   = pt(30)   // 150 + 240

  const trackD = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`

  // Progress arc: uses stroke-dasharray trick
  return (
    <svg viewBox="0 0 104 80" className="w-32 h-24">
      {/* Track */}
      <path d={trackD} fill="none" stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round" />
      {/* Progress */}
      <path
        d={trackD}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap + 0.01}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Score text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="800" fill="#111827">
        {score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fontWeight="700" fill="#9ca3af" letterSpacing="1">
        / 100
      </text>
    </svg>
  )
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-none">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold text-gray-900">{value}</span>
        {sub && <span className="text-[10px] text-gray-400 ml-1">{sub}</span>}
      </div>
    </div>
  )
}

export default function SquadRatingCard({ state }: Props) {
  const { score, avgForm, avgFdr, fitCount } = calculateSquadRating(state)
  const { text, color } = ratingLabel(score)
  const { squadPower, xiPower, xiGWScore } = squadPowerStats(state.squad)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">Squad Rating</p>

      <div className="flex items-center gap-4">
        <Gauge score={score} />

        <div className="flex-1">
          <p className="text-base font-extrabold mb-3" style={{ color }}>{text}</p>
          <StatRow label="Avg Form"     value={avgForm.toFixed(1)} sub="/ 10" />
          <StatRow label="Next Fixture" value={`FDR ${avgFdr.toFixed(1)}`} />
          <StatRow label="Availability" value={`${fitCount} / 11`} sub="fit" />
        </div>
      </div>

      {/* Power stats row */}
      <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2">
        {[
          { label: 'Squad Power', value: squadPower },
          { label: 'XI Power',    value: xiPower    },
          { label: 'GW Score',    value: xiGWScore  },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className={`text-base font-extrabold px-2 py-0.5 rounded-md ${powerColor(value)}`}>
              {value}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
