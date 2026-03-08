'use client'

import { useEffect, useState } from 'react'

export default function MarketBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/market-briefing')
      .then(r => r.json())
      .then(data => {
        if (data.briefing) setBriefing(data.briefing)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
          KI-Marktanalyse
        </span>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="shimmer h-4 rounded w-full" />
          <div className="shimmer h-4 rounded w-4/5" />
          <div className="shimmer h-4 rounded w-3/5" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-white/30">Marktanalyse momentan nicht verfügbar.</p>
      )}

      {!loading && briefing && (
        <p className="text-sm text-white/75 leading-relaxed">{briefing}</p>
      )}
    </div>
  )
}
