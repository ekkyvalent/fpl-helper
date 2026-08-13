'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from './AppProvider'
import { fmt } from '@/lib/fpl'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/team', label: 'My Team', icon: '⚽' },
  { href: '/standings', label: 'Standings', icon: '🏆' },
  { href: '/players', label: 'Players', icon: '👤' },
  { href: '/fixtures', label: 'Fixtures', icon: '📅' },
  { href: '/news', label: 'News', icon: '📰' },
  { href: '/leagues', label: 'Leagues', icon: '👥' },
  { href: '/history', label: 'History', icon: '📈' },
  { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function TeamSummaryCard() {
  const { state, savedId } = useApp()
  if (!state) return null
  const { teamInfo } = state
  return (
    <div className="bg-green-50/70 border border-green-100 rounded-xl p-3 mb-4">
      <p className="text-[11px] font-extrabold text-green-700 truncate">{teamInfo.name}</p>
      <p className="text-[10px] text-green-600 mt-0.5">ID {savedId}</p>
      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
        <div>
          <p className="text-[9px] text-green-600/70 uppercase font-bold">Pts</p>
          <p className="text-[11px] font-extrabold text-green-800">{teamInfo.summary_overall_points ?? '—'}</p>
        </div>
        <div>
          <p className="text-[9px] text-green-600/70 uppercase font-bold">Rank</p>
          <p className="text-[11px] font-extrabold text-green-800">
            {teamInfo.summary_overall_rank ? `#${teamInfo.summary_overall_rank.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-green-600/70 uppercase font-bold">Value</p>
          <p className="text-[11px] font-extrabold text-green-800">{fmt(teamInfo.last_deadline_value)}</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-white border-r border-gray-100 overflow-y-auto">
      <div className="p-3">
        <TeamSummaryCard />
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-green-600/10 text-green-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden flex bg-white border-t border-gray-100 shrink-0 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 pb-2.5 min-w-[64px] px-1 text-[9px] font-bold shrink-0 transition-colors ${
              active ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
