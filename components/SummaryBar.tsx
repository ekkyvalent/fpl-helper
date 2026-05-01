import type { AppState } from '@/lib/types'
import { fmt } from '@/lib/fpl'

interface Props { state: AppState }

function Card({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 shadow-xs border ${highlight ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
      <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${highlight ? 'text-green-600' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-[15px] font-extrabold tracking-tight leading-tight ${highlight ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 leading-tight ${highlight ? 'text-green-600' : 'text-gray-400'}`}>{sub}</p>
    </div>
  )
}

export default function SummaryBar({ state }: Props) {
  const { teamInfo, picks, currentGW } = state
  const eh = picks.entry_history

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card
        label={`GW ${currentGW} Points`}
        value={`${eh?.points ?? 0} pts`}
        sub={`GW rank: ${eh?.rank ? `#${eh.rank.toLocaleString()}` : '—'}`}
        highlight
      />
      <Card
        label="Season Total"
        value={`${teamInfo.summary_overall_points ?? '—'} pts`}
        sub={`Rank: ${teamInfo.summary_overall_rank ? `#${teamInfo.summary_overall_rank.toLocaleString()}` : '—'}`}
      />
      <Card
        label="Squad Value"
        value={fmt(teamInfo.last_deadline_value)}
        sub={`${fmt(teamInfo.last_deadline_bank)} in the bank`}
      />
      <Card
        label="Manager"
        value={`${teamInfo.player_first_name} ${teamInfo.player_last_name}`}
        sub={teamInfo.name}
      />
    </div>
  )
}
