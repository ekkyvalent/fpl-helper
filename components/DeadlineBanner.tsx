'use client'

import { useEffect, useState } from 'react'

export default function DeadlineBanner({ deadline }: { deadline: { gw: number; time: string } }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const deadlineMs = new Date(deadline.time).getTime()
  const diffMs     = deadlineMs - now
  if (diffMs <= 0) return null

  const diffH  = Math.floor(diffMs / 3_600_000)
  const diffM  = Math.floor((diffMs % 3_600_000) / 60_000)
  const diffD  = Math.floor(diffH / 24)

  const countdown =
    diffH < 1  ? `${diffM}m left` :
    diffH < 24 ? `${diffH}h ${diffM}m left` :
                 `${diffD}d ${diffH % 24}h left`

  const isUrgent = diffH < 24

  const formatted = new Date(deadline.time).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })

  return (
    <div className={`flex items-center justify-between gap-3 px-5 py-2 text-xs font-semibold border-b ${
      isUrgent
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-blue-50 border-blue-100 text-blue-700'
    }`}>
      <span>
        {isUrgent ? '⚠️' : '📅'}{' '}
        <strong>GW{deadline.gw} deadline:</strong> {formatted}
      </span>
      <span className={`shrink-0 font-bold px-2 py-0.5 rounded-full text-[11px] ${
        isUrgent ? 'bg-amber-200 text-amber-900' : 'bg-blue-100 text-blue-800'
      }`}>
        {countdown}
      </span>
    </div>
  )
}
