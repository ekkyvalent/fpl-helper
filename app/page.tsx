'use client'

import { useState, useCallback } from 'react'
import type { AppState } from '@/lib/types'
import { buildAppState } from '@/lib/fpl'
import SummaryBar from '@/components/SummaryBar'
import SquadTab from '@/components/SquadTab'
import FixturesTab from '@/components/FixturesTab'
import TransfersTab from '@/components/TransfersTab'
import CaptainTab from '@/components/CaptainTab'

const TABS = ['Squad', 'Fixtures', 'Transfers', 'Captain'] as const
type Tab = (typeof TABS)[number]

// ── Input Screen ─────────────────────────────────────────────
function InputScreen({ onLoad }: { onLoad: (id: string) => void }) {
  const [value, setValue] = useState('')
  const [err, setErr] = useState('')

  function submit() {
    const id = parseInt(value)
    if (!id || id < 1) { setErr('Please enter a valid Team ID.'); return }
    setErr('')
    onLoad(value)
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-green-600 mb-3">
        Fantasy Premier League
      </p>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gray-900 mb-3 leading-none">
        Your <span className="text-green-600">smart</span>
        <br />FPL assistant
      </h1>
      <p className="text-gray-500 text-base mb-10 max-w-sm">
        Squad insights, fixture difficulty &amp; transfer recommendations — all in one place.
      </p>

      <div className="flex gap-2.5 w-full max-w-sm">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Your Team ID"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[15px] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition bg-white text-gray-900 placeholder:text-gray-300"
        />
        <button
          onClick={submit}
          className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap cursor-pointer"
        >
          Load Team →
        </button>
      </div>

      {err && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl max-w-sm w-full">
          {err}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Find your Team ID at{' '}
        <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener" className="text-green-600">
          fantasy.premierleague.com
        </a>{' '}
        → Points → check the URL
      </p>
    </div>
  )
}

// ── Loading Screen ────────────────────────────────────────────
function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      <div className="w-9 h-9 border-[3px] border-gray-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  )
}

// ── App Screen ────────────────────────────────────────────────
function AppScreen({ state }: { state: AppState }) {
  const [activeTab, setActiveTab] = useState<Tab>('Squad')

  return (
    <div className="flex-1">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <SummaryBar state={state} />

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-7">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Squad'     && <SquadTab     state={state} />}
        {activeTab === 'Fixtures'  && <FixturesTab  state={state} />}
        {activeTab === 'Transfers' && <TransfersTab state={state} />}
        {activeTab === 'Captain'   && <CaptainTab   state={state} />}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen]     = useState<'input' | 'loading' | 'app'>('input')
  const [loadMsg, setLoadMsg]   = useState('')
  const [error, setError]       = useState('')
  const [appState, setAppState] = useState<AppState | null>(null)

  const fpl = useCallback(async (path: string) => {
    const res = await fetch(`/api/fpl${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  async function loadTeam(teamId: string) {
    setScreen('loading')
    setError('')

    try {
      setLoadMsg('Fetching global FPL data…')
      const bootstrap = await fpl('/bootstrap-static')

      const currentEvent =
        bootstrap.events.find((e: { is_current: boolean }) => e.is_current) ||
        bootstrap.events.find((e: { is_next: boolean }) => e.is_next) ||
        bootstrap.events.at(-1)
      const currentGW: number = currentEvent.id

      setLoadMsg('Loading your team info…')
      const teamInfo = await fpl(`/entry/${teamId}`)

      setLoadMsg('Fetching squad picks…')
      let picks
      try {
        picks = await fpl(`/entry/${teamId}/event/${currentGW}/picks`)
      } catch {
        picks = await fpl(`/entry/${teamId}/event/${currentGW - 1}/picks`)
      }

      setLoadMsg('Pulling fixture data…')
      const fixtures = await fpl('/fixtures')

      const state = buildAppState(bootstrap, teamInfo, picks, fixtures, currentGW)
      setAppState(state)
      setScreen('app')
    } catch (err) {
      console.error(err)
      setError('Could not load team. Double-check your Team ID and try again.')
      setScreen('input')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => { setScreen('input'); setAppState(null) }}
          className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
        >
          <span className="w-2 h-2 bg-green-600 rounded-full" />
          <span className="text-[17px] font-extrabold text-green-600 tracking-tight">FPL Helper</span>
        </button>
        {appState && screen === 'app' && (
          <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
            GW {appState.currentGW}
          </span>
        )}
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 text-sm px-6 py-2.5 text-center">
          {error}
        </div>
      )}

      {screen === 'input'   && <InputScreen onLoad={loadTeam} />}
      {screen === 'loading' && <LoadingScreen msg={loadMsg} />}
      {screen === 'app'     && appState && <AppScreen state={appState} />}
    </div>
  )
}
