'use client'

import Link from 'next/link'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import AppProvider, { useApp } from '@/components/AppProvider'
import InputScreen from '@/components/InputScreen'
import LoadingScreen from '@/components/LoadingScreen'
import DeadlineBanner from '@/components/DeadlineBanner'
import { Sidebar, MobileNav } from '@/components/Sidebar'

function Header() {
  const { savedId, state } = useApp()

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-50 shrink-0">
      <Link href="/" className="flex items-center gap-2 cursor-pointer no-underline">
        <span className="w-2 h-2 bg-green-600 rounded-full" />
        <span className="text-[17px] font-extrabold text-green-600 tracking-tight">FPL Helper</span>
      </Link>
      <div className="flex items-center gap-2">
        {state && (
          <>
            <span className="hidden sm:inline bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
              ID {savedId}
            </span>
            <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
              GW {state.currentGW}
            </span>
            <Link
              href="/settings"
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 px-3 py-1 rounded-full transition-colors cursor-pointer no-underline"
            >
              Change Team
            </Link>
          </>
        )}
        <a
          href="https://ko-fi.com/ekkypramana"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
        >
          <span>☕</span>
          <span className="hidden sm:inline">Support</span>
        </a>
      </div>
    </header>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { screen, loadMsg, error, savedId, state, loadTeam, forgetTeam } = useApp()

  if (screen === 'input') {
    return (
      <div className="h-[100svh] flex flex-col bg-[#f8faf9] overflow-hidden">
        <InputScreen onLoad={loadTeam} onForget={forgetTeam} savedId={savedId} />
      </div>
    )
  }

  if (screen === 'loading') {
    return (
      <div className="h-[100svh] flex flex-col bg-[#f8faf9] overflow-hidden">
        <LoadingScreen msg={loadMsg} />
      </div>
    )
  }

  return (
    <div className="h-[100svh] flex flex-col bg-[#f8faf9] overflow-hidden">
      <Header />

      {state?.nextDeadline && <DeadlineBanner deadline={state.nextDeadline} />}

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 text-sm px-6 py-2.5 text-center shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
