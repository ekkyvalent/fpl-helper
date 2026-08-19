'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { AppState, FPLPicks, SquadPlayer } from '@/lib/types'
import { buildAppState } from '@/lib/fpl'

type Screen = 'input' | 'loading' | 'app'

interface League {
  id: string
  type: 'classic' | 'h2h'
}

interface ChipPreview {
  squad: SquadPlayer[]
  label: string
}

interface AppContextValue {
  screen: Screen
  loadMsg: string
  error: string
  teamId: string
  savedId: string
  state: AppState | null
  chipPreview: ChipPreview | null
  watchlist: number[]
  leagues: League[]
  loadTeam: (id: string) => void
  forgetTeam: () => void
  setChipPreview: (preview: ChipPreview | null) => void
  toggleWatch: (playerId: number) => void
  addLeague: (league: League) => void
  removeLeague: (id: string, type: 'classic' | 'h2h') => void
}

const TEAM_KEY = 'fpl_team_id'
const WATCHLIST_KEY = 'fpl_watchlist'
const LEAGUES_KEY = 'fpl_leagues'

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('input')
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(() => (typeof window === 'undefined' ? '' : localStorage.getItem(TEAM_KEY) ?? ''))
  const [appState, setAppState] = useState<AppState | null>(null)
  const [chipPreview, setChipPreviewState] = useState<ChipPreview | null>(null)
  const [watchlist, setWatchlist] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [leagues, setLeagues] = useState<League[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(LEAGUES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Load persisted values on first mount
  useEffect(() => {
    const storedTeam = localStorage.getItem(TEAM_KEY) ?? ''
    if (storedTeam) {
      loadTeam(storedTeam)
    }
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
      let picks: FPLPicks | null = null
      for (const gw of [currentGW, currentGW - 1, currentGW - 2]) {
        try {
          picks = await fpl(`/entry/${teamId}/event/${gw}/picks`)
          if (picks) break
        } catch {
          // try previous GW — pre-season has no picks data yet
        }
      }

      setLoadMsg('Pulling fixture data…')
      const fixtures = await fpl('/fixtures')

      const state = buildAppState(bootstrap, teamInfo, picks, fixtures, currentGW)
      setAppState({
        ...state,
        bootstrap: { ...state.bootstrap, fixtures },
      })
      setScreen('app')

      localStorage.setItem(TEAM_KEY, teamId)
      setSavedId(teamId)
    } catch (err) {
      console.error('[loadTeam error]', err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Could not load team — ${msg}. Double-check your Team ID and try again.`)
      setScreen('input')
    }
  }

  function forgetTeam() {
    localStorage.removeItem(TEAM_KEY)
    setSavedId('')
    setAppState(null)
    setScreen('input')
  }

  function toggleWatch(playerId: number) {
    setWatchlist((prev) => {
      const next = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next))
      return next
    })
  }

  function addLeague(league: League) {
    setLeagues((prev) => {
      const exists = prev.some((l) => l.id === league.id && l.type === league.type)
      if (exists) return prev
      const next = [...prev, league]
      localStorage.setItem(LEAGUES_KEY, JSON.stringify(next))
      return next
    })
  }

  function removeLeague(id: string, type: 'classic' | 'h2h') {
    setLeagues((prev) => {
      const next = prev.filter((l) => !(l.id === id && l.type === type))
      localStorage.setItem(LEAGUES_KEY, JSON.stringify(next))
      return next
    })
  }

  const value: AppContextValue = {
    screen,
    loadMsg,
    error,
    teamId: savedId,
    savedId,
    state: appState,
    chipPreview,
    watchlist,
    leagues,
    loadTeam,
    forgetTeam,
    setChipPreview: setChipPreviewState,
    toggleWatch,
    addLeague,
    removeLeague,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
