import type { AppState } from '@/lib/types'
import { fmt } from '@/lib/fpl'

interface Props { state: AppState }

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xs">
      <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-[15px] font-extrabold text-gray-900 tracking-tight leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</p>
    </div>
  )
}

export default function SummaryBar({ state }: Props) {
  const { teamInfo, picks, currentGW } = state
  const eh = picks.entry_history

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card
        label="Manager"
        value={`${teamInfo.player_first_name} ${teamInfo.player_last_name}`}
        sub={teamInfo.name}
      />
      <Card
        label="Squad Value"
        value={fmt(teamInfo.last_deadline_value)}
        sub={`${fmt(teamInfo.last_deadline_bank)} ITB`}
      />
      <Card
        label="Overall Rank"
        value={teamInfo.summary_overall_rank ? `#${teamInfo.summary_overall_rank.toLocaleString()}` : '—'}
        sub={`${teamInfo.summary_overall_points ?? '—'} total pts`}
      />
      <Card
        label="Gameweek"
        value={`GW ${currentGW}`}
        sub={`${eh?.points ?? 0} pts this GW`}
      />
    </div>
  )
}
