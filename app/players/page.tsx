'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/components/AppProvider'
import { enrichAllPlayers, playerPowerRating, playerGWScore, fixtureDifficulty, posLabel, fmt } from '@/lib/fpl'
import type { SquadPlayer } from '@/lib/types'

type SortKey =
  | 'name' | 'pos' | 'team' | 'price' | 'total_points' | 'form'
  | 'goals' | 'assists' | 'cs' | 'xg90' | 'xa90' | 'ppg' | 'ppm'
  | 'ict' | 'sel' | 'pwr' | 'gw' | 'fdr'

const POS_FILTERS = [
  { label: 'All', value: 0 },
  { label: 'GK', value: 1 },
  { label: 'DEF', value: 2 },
  { label: 'MID', value: 3 },
  { label: 'FWD', value: 4 },
]

interface SortHeaderProps {
  label: string
  k: SortKey
  align?: string
  activeKey: SortKey
  direction: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}

function SortHeader({ label, k, align = 'text-right', activeKey, direction, onSort }: SortHeaderProps) {
  return (
    <th className={`px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap ${align}`}>
      <button
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider text-[11px] font-bold text-gray-400 hover:text-gray-700"
      >
        {label}
        <span className="text-[9px]">{activeKey === k ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}

function valueFor(p: SquadPlayer, key: SortKey): string | number {
  switch (key) {
    case 'name': return p.web_name.toLowerCase()
    case 'pos': return p.element_type
    case 'team': return p.teamShort
    case 'price': return p.now_cost
    case 'total_points': return p.total_points
    case 'form': return parseFloat(p.form || '0')
    case 'goals': return p.goals_scored ?? 0
    case 'assists': return p.assists ?? 0
    case 'cs': return p.clean_sheets
    case 'xg90': return parseFloat(p.expected_goals_per_90 || '0')
    case 'xa90': return parseFloat(p.expected_assists_per_90 || '0')
    case 'ppg': return parseFloat(p.points_per_game || '0')
    case 'ppm': return p.total_points / (p.now_cost / 10)
    case 'ict': return p.ict_index ?? 0
    case 'sel': return parseFloat(p.selected_by_percent || '0')
    case 'pwr': return playerPowerRating(p)
    case 'gw': return playerGWScore(p)
    case 'fdr': return p.fixtures.slice(0, 3).reduce((s, f) => s + fixtureDifficulty(f, p.element_type), 0) / Math.max(p.fixtures.slice(0, 3).length, 1)
  }
}

export default function PlayersPage() {
  const { state, watchlist, toggleWatch } = useApp()
  const [sortKey, setSortKey] = useState<SortKey>('pwr')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [posFilter, setPosFilter] = useState(0)
  const [search, setSearch] = useState('')

  const allPlayers = useMemo(() => {
    if (!state) return []
    return enrichAllPlayers(state)
  }, [state])

  const filtered = useMemo(() => {
    let list = allPlayers
    if (posFilter !== 0) list = list.filter((p) => p.element_type === posFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.web_name.toLowerCase().includes(q) ||
          p.teamShort.toLowerCase().includes(q) ||
          p.teamFull.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      const va = valueFor(a, sortKey)
      const vb = valueFor(b, sortKey)
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [allPlayers, posFilter, search, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (!state) return null

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Players</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or team…"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white text-gray-900 placeholder:text-gray-300"
        />
        <div className="flex gap-1 flex-wrap">
          {POS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPosFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                posFilter === f.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">Name</th>
                <SortHeader label="Pos" k="pos" align="text-left" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Team" k="team" align="text-left" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Price" k="price" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Total" k="total_points" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Form" k="form" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Goals" k="goals" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Assists" k="assists" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="CS" k="cs" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="xG/90" k="xg90" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="xA/90" k="xa90" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="PPG" k="ppg" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="PPM" k="ppm" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="ICT" k="ict" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Sel%" k="sel" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="PWR" k="pwr" align="text-center" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="GW" k="gw" align="text-center" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="FDR" k="fdr" align="text-center" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">Track</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tracked = watchlist.includes(p.id)
                const fdr = p.fixtures.slice(0, 3).reduce((s, f) => s + fixtureDifficulty(f, p.element_type), 0) / Math.max(p.fixtures.slice(0, 3).length, 1)
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-[13px]">{p.web_name}</p>
                          <p className="text-[11px] text-gray-400">{p.teamShort} · {posLabel(p.element_type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-left text-xs text-gray-500">{posLabel(p.element_type)}</td>
                    <td className="px-2 py-2.5 text-left text-xs text-gray-500">{p.teamShort}</td>
                    <td className="px-2 py-2.5 text-right text-[12px] font-semibold text-gray-700">{fmt(p.now_cost)}</td>
                    <td className="px-2 py-2.5 text-right text-xs font-semibold text-gray-700">{p.total_points}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{parseFloat(p.form || '0').toFixed(1)}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{p.goals_scored ?? 0}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{p.assists ?? 0}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{p.clean_sheets}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{parseFloat(p.expected_goals_per_90 || '0').toFixed(2)}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{parseFloat(p.expected_assists_per_90 || '0').toFixed(2)}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{parseFloat(p.points_per_game || '0').toFixed(1)}</td>
                    <td className="px-2 py-2.5 text-right text-xs font-semibold text-green-700">{(p.total_points / (p.now_cost / 10)).toFixed(1)}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{p.ict_index ?? 0}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-600">{parseFloat(p.selected_by_percent || '0').toFixed(1)}%</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">{playerPowerRating(p)}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">{playerGWScore(p)}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{fdr.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => toggleWatch(p.id)}
                        className={`text-base leading-none cursor-pointer transition-colors ${tracked ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-500'}`}
                        aria-label={tracked ? 'Untrack player' : 'Track player'}
                      >
                        {tracked ? '★' : '☆'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
