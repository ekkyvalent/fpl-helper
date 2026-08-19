'use client'

import { useState } from 'react'
import { useApp } from '@/components/AppProvider'

export default function SettingsPage() {
  const { savedId, loadTeam, forgetTeam } = useApp()
  const [value, setValue] = useState(savedId)
  const [err, setErr] = useState('')

  function handleSave() {
    const id = parseInt(value)
    if (!id || id < 1) {
      setErr('Please enter a valid Team ID.')
      return
    }
    setErr('')
    loadTeam(value)
  }

  function clearWatchlist() {
    if (!window.confirm('Clear your watchlist?')) return
    localStorage.removeItem('fpl_watchlist')
    window.location.reload()
  }

  function clearLeagues() {
    if (!window.confirm('Clear saved leagues?')) return
    localStorage.removeItem('fpl_leagues')
    window.location.reload()
  }

  function resetManualSquad() {
    if (!window.confirm('Reset your manual pre-season squad?')) return
    localStorage.removeItem('fpl-manual-squad')
    window.location.reload()
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Settings</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Change Team</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Your Team ID"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white text-gray-900 placeholder:text-gray-300"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
        {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Team ID</p>
        <button
          onClick={forgetTeam}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-sm transition-colors cursor-pointer"
        >
          Forget saved Team ID
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Data Management</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={clearWatchlist}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-lg text-sm transition-colors cursor-pointer text-left"
          >
            Clear watchlist
          </button>
          <button
            onClick={clearLeagues}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-lg text-sm transition-colors cursor-pointer text-left"
          >
            Clear saved leagues
          </button>
          <button
            onClick={resetManualSquad}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-lg text-sm transition-colors cursor-pointer text-left"
          >
            Reset manual squad
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-2">About</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Free forever · Built with ☕ ·{' '}
          <a
            href="https://ko-fi.com/ekkypramana"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-600 hover:text-yellow-700 font-semibold"
          >
            Buy me a coffee if it helped
          </a>
        </p>
      </div>
    </div>
  )
}
