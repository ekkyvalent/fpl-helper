'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/components/AppProvider'

interface HistoryGW {
  event: number
  points: number
  total_points: number
  rank: number
  overall_rank: number
  bank: number
  value: number
  event_transfers: number
}

interface HistorySeason {
  season_name: string
  total_points: number
  rank: number
}

interface HistoryChip {
  name: string
  time: string
  event: number
}

interface HistoryData {
  current: HistoryGW[]
  past: HistorySeason[]
  chips: HistoryChip[]
}

function GWBarChart({ data }: { data: HistoryGW[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No gameweek points yet this season.</p>
  }

  const max = Math.max(...data.map((d) => d.points), 1)
  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {data.map((d) => (
          <div key={d.event} className="flex flex-col items-center gap-1 shrink-0 min-w-[24px]">
            <span className="text-[9px] font-bold text-gray-600">{d.points}</span>
            <div
              className={`w-5 rounded-t ${d.points === max ? 'bg-green-500' : 'bg-green-200'}`}
              style={{ height: `${Math.max((d.points / max) * 100, 4)}px` }}
            />
            <span className="text-[8px] text-gray-400">GW{d.event}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankTrend({ data }: { data: HistoryGW[] }) {
  const withRank = data.filter((d) => d.overall_rank != null)
  if (withRank.length === 0) {
    return <p className="text-sm text-gray-500">No rank data yet this season.</p>
  }

  const width = 100
  const height = 50
  const maxRank = Math.max(...withRank.map((d) => d.overall_rank))
  const minRank = Math.min(...withRank.map((d) => d.overall_rank))
  const range = Math.max(maxRank - minRank, 1)

  const points = withRank.map((d, i) => {
    const x = (i / Math.max(withRank.length - 1, 1)) * width
    const y = height - ((d.overall_rank - minRank) / range) * (height - 10) - 5
    return { x, y, rank: d.overall_rank, gw: d.event }
  })

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
        <polyline
          points={polyline}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.5"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#16a34a" />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
        <span>Best #{minRank.toLocaleString()}</span>
        <span>Worst #{maxRank.toLocaleString()}</span>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Lower is better. Trend shows overall rank by gameweek.</p>
    </div>
  )
}

export default function HistoryPage() {
  const { state } = useApp()
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!state) return
    let cancelled = false
    fetch(`/api/fpl/entry/${state.teamInfo.id}/history/`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [state])

  if (!state) return null

  if (loading) {
    return (
      <div className="p-4 sm:p-5 flex items-center justify-center py-16">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (err) {
    return (
      <div className="p-4 sm:p-5">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-8 shadow-xs text-center">
          <p className="text-sm text-red-500">Could not load history — {err}.</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-900">History</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Gameweek Points</p>
        <GWBarChart data={data.current ?? []} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Overall Rank Trend</p>
        <RankTrend data={data.current ?? []} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Chips Used</p>
        {(data.chips ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No chips used yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.chips.map((chip, i) => (
              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {chip.name} · GW{chip.event}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Past Seasons</p>
        </div>
        {(data.past ?? []).length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-500">No past seasons found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="py-2.5 px-4">Season</th>
                  <th className="py-2.5 px-2 text-center">Total Points</th>
                  <th className="py-2.5 px-4 text-center">Rank</th>
                </tr>
              </thead>
              <tbody>
                {data.past.map((s) => (
                  <tr key={s.season_name} className="border-b border-gray-50 last:border-none">
                    <td className="py-2.5 px-4 font-semibold text-gray-900 text-[13px]">{s.season_name}</td>
                    <td className="py-2.5 px-2 text-center text-xs font-semibold text-gray-700">{s.total_points.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-center text-xs text-gray-500">{s.rank ? `#${s.rank.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
