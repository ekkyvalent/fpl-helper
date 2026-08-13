'use client'

import { useState } from 'react'

interface Props {
  onLoad: (id: string) => void
  onForget: () => void
  savedId: string
}

export default function InputScreen({ onLoad, onForget, savedId }: Props) {
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

      <p className="mt-10 text-xs text-gray-400 text-center">
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
  )
}
