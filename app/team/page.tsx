'use client'

import { useApp } from '@/components/AppProvider'
import PreSeasonBuilder from '@/components/PreSeasonBuilder'
import SquadTab from '@/components/SquadTab'
import TransfersTab from '@/components/TransfersTab'
import CaptainTab from '@/components/CaptainTab'
import ChipTab from '@/components/ChipTab'
import { useState } from 'react'

const TEAM_TABS = ['Squad', 'Transfers', 'Captain', 'Chip'] as const
type TeamTab = (typeof TEAM_TABS)[number]

export default function TeamPage() {
  const { state, chipPreview, setChipPreview } = useApp()
  const [activeTab, setActiveTab] = useState<TeamTab>('Squad')

  if (!state) return null

  if (state.squad.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-blue-700">
          Pre-season mode — no squad picks yet. Build your GW1 squad below.
        </div>
        <PreSeasonBuilder state={state} />
      </div>
    )
  }

  function handleTabChange(tab: TeamTab) {
    setActiveTab(tab)
    if (tab !== 'Chip') setChipPreview(null)
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4 overflow-x-auto max-w-full">
        {TEAM_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'Chip' ? '🃏 Chip' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'Squad' && (
        <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-4 items-start">
          <div className="bg-[#f0f5f0] rounded-2xl p-4">
            <SquadTab
              state={state}
              previewSquad={chipPreview?.squad}
              previewLabel={chipPreview?.label}
            />
          </div>
        </div>
      )}
      {activeTab === 'Transfers' && <TransfersTab state={state} />}
      {activeTab === 'Captain' && <CaptainTab state={state} />}
      {activeTab === 'Chip' && (
        <ChipTab
          state={state}
          onSquadChange={(squad, label) => setChipPreview({ squad, label })}
        />
      )}
    </div>
  )
}
