'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AppState, SquadPlayer } from '@/lib/types'
import { buildAppState } from '@/lib/fpl'
import SummaryBar from '@/components/SummaryBar'
import SquadRatingCard from '@/components/SquadRatingCard'
import SquadTab from '@/components/SquadTab'
import FixturesTab from '@/components/FixturesTab'
import TransfersTab from '@/components/TransfersTab'
import CaptainTab from '@/components/CaptainTab'
import ChipTab from '@/components/ChipTab'

const STORAGE_KEY = 'fpl_team_id'
const RIGHT_TABS = ['Fixtures', 'Transfers', 'Captain', 'Chip'] as const
type RightTab = (typeof RIGHT_TABS)[number]

// ── Input Screen ─────────────────────────────────────────────
function InputScreen({
  onLoad,
  onForget,
  savedId,
}: {
  onLoad: (id: string) => void
  onForget: () => void
  savedId: string
}) {
  const [value, setValue] = useState(savedId)
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

      {savedId && (
        <button
          onClick={onForget}
          className="mt-3 text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer underline underline-offset-2"
        >
          Forget saved Team ID
        </button>
      )}
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

// ── Mobile tab labels ─────────────────────────────────────────
const TAB_LABELS: Record<string, string> = {
  Squad: '⚽', Fixtures: '📋', Transfers: '🔄', Captain: '©', Chip: '🃏'
}
const MOBILE_TABS = ['Squad', ...RIGHT_TABS] as const
type MobileTab = (typeof MOBILE_TABS)[number]

// ── App Screen ────────────────────────────────────────────────
function AppScreen({ state, teamId }: { state: AppState; teamId: string }) {
  const [activeTab, setActiveTab]     = useState<RightTab>('Fixtures')
  const [mobileTab, setMobileTab]     = useState<MobileTab>('Fixtures')
  const [chipPreview, setChipPreview] = useState<{ squad: SquadPlayer[]; label: string } | null>(null)

  function handleTabChange(tab: RightTab) {
    setActiveTab(tab)
    if (tab !== 'Chip') setChipPreview(null)
  }

  function handleMobileTab(tab: MobileTab) {
    setMobileTab(tab)
    if (tab !== 'Chip') setChipPreview(null)
    if (tab !== 'Squad' && RIGHT_TABS.includes(tab as RightTab)) {
      setActiveTab(tab as RightTab)
    }
  }

  const chipProps = {
    state,
    onSquadChange: (squad: SquadPlayer[], label: string) => setChipPreview({ squad, label }),
  }

  return (
    <>
    {/* ════════════════════════════════════════
        DESKTOP layout (md and above)
    ════════════════════════════════════════ */}
    <div className="hidden md:flex flex-1 overflow-hidden" style={{ height: 'calc(100svh - 56px)' }}>

      {/* LEFT: Pitch */}
      <div className="w-[400px] shrink-0 border-r border-gray-100 bg-[#f0f5f0] overflow-y-auto p-4 flex flex-col gap-3">
        <SquadTab
          state={state}
          previewSquad={chipPreview?.squad}
          previewLabel={chipPreview?.label}
        />
      </div>

      {/* RIGHT: Info + Tabs */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-w-0">
        <SummaryBar state={state} />
        <SquadRatingCard state={state} />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'Chip' ? '🃏 Chip' : tab}
              </button>
            ))}
          </div>

          {activeTab === 'Fixtures'  && <FixturesTab  state={state} />}
          {activeTab === 'Transfers' && <TransfersTab state={state} />}
          {activeTab === 'Captain'   && <CaptainTab   state={state} />}
          {activeTab === 'Chip'      && <ChipTab {...chipProps} />}
        </div>
      </div>
    </div>

    {/* ════════════════════════════════════════
        MOBILE layout (below md)
    ════════════════════════════════════════ */}
    <div className="flex md:hidden flex-col flex-1 min-h-0">

      {/* Summary strip — always visible on non-Squad tabs */}
      {mobileTab !== 'Squad' && (
        <div className="px-3 pt-3 flex flex-col gap-3 shrink-0">
          <SummaryBar state={state} />
          <SquadRatingCard state={state} />
        </div>
      )}

      {/* Scrollable content — min-h-0 is critical for flex children */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {mobileTab === 'Squad' && (
          <div className="bg-[#f0f5f0] p-3 min-h-full">
            <SquadTab
              state={state}
              previewSquad={chipPreview?.squad}
              previewLabel={chipPreview?.label}
            />
          </div>
        )}
        {mobileTab !== 'Squad' && (
          <div className="p-3 flex flex-col gap-3">
            {mobileTab === 'Fixtures'  && <FixturesTab  state={state} />}
            {mobileTab === 'Transfers' && <TransfersTab state={state} />}
            {mobileTab === 'Captain'   && <CaptainTab   state={state} />}
            {mobileTab === 'Chip'      && <ChipTab {...chipProps} />}
          </div>
        )}
      </div>

      {/* Bottom tab bar — shrink-0 keeps it pinned */}
      <div className="bg-white border-t border-gray-100 flex shrink-0">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleMobileTab(tab)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 pb-3 text-[10px] font-bold transition-colors cursor-pointer ${
              mobileTab === tab ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className="text-base leading-none">{TAB_LABELS[tab]}</span>
            <span>{tab}</span>
          </button>
        ))}
      </div>
    </div>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen]     = useState<'input' | 'loading' | 'app'>('input')
  const [loadMsg, setLoadMsg]   = useState('')
  const [error, setError]       = useState('')
  const [appState, setAppState] = useState<AppState | null>(null)
  const [savedId, setSavedId]   = useState('')

  // On first mount: read saved ID and auto-load if present
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ''
    setSavedId(stored)
    if (stored) loadTeam(stored)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      for (const gw of [currentGW, currentGW - 1, currentGW - 2]) {
        try {
          picks = await fpl(`/entry/${teamId}/event/${gw}/picks`)
          if (picks) break
        } catch {
          // try previous GW
        }
      }
      if (!picks) throw new Error('Could not find picks for any recent gameweek')

      setLoadMsg('Pulling fixture data…')
      const fixtures = await fpl('/fixtures')

      const state = buildAppState(bootstrap, teamInfo, picks, fixtures, currentGW)
      setAppState(state)
      setScreen('app')

      // Persist the ID for next visit
      localStorage.setItem(STORAGE_KEY, teamId)
      setSavedId(teamId)
    } catch (err) {
      console.error('[loadTeam error]', err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Could not load team — ${msg}. Double-check your Team ID and try again.`)
      setScreen('input')
    }
  }

  function forgetTeam() {
    localStorage.removeItem(STORAGE_KEY)
    setSavedId('')
  }

  return (
    <div className="h-[100svh] flex flex-col bg-[#f8faf9] overflow-hidden">
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
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
              ID {savedId}
            </span>
            <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
              GW {appState.currentGW}
            </span>
            <button
              onClick={() => { setScreen('input'); setAppState(null) }}
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 px-3 py-1 rounded-full transition-colors cursor-pointer bg-transparent"
            >
              Change Team
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 text-sm px-6 py-2.5 text-center">
          {error}
        </div>
      )}

      {screen === 'input'   && <InputScreen onLoad={loadTeam} onForget={forgetTeam} savedId={savedId} />}
      {screen === 'loading' && <LoadingScreen msg={loadMsg} />}
      {screen === 'app'     && appState && <AppScreen state={appState} teamId={savedId} />}
    </div>
  )
}
