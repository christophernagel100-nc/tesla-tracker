'use client'

import { useEffect, useState } from 'react'
import type { MarketBriefingData } from '@/app/api/market-briefing/route'

export default function MarketBriefing() {
  const [data, setData] = useState<MarketBriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/market-briefing')
      .then(r => r.json())
      .then(res => {
        if (res.data) setData(res.data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          KI-Marktanalyse
        </span>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="shimmer h-3 rounded w-24" />
              <div className="shimmer h-4 rounded w-full" />
              <div className="shimmer h-4 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-subtle-foreground">Marktanalyse momentan nicht verfügbar.</p>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Marktlage */}
          <div className="bg-subtle border border-border rounded-xl p-3">
            <div className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wide mb-1.5">
              Marktlage
            </div>
            <p className="text-sm text-foreground/80 leading-snug">{data.marktlage}</p>
          </div>

          {/* Top-Angebot */}
          <div className="bg-subtle border border-indigo-500/20 rounded-xl p-3">
            <div className="text-[10px] font-medium text-indigo-500/70 uppercase tracking-wide mb-1.5">
              Top-Angebot
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{data.topAngebot.preis}</span>
              <span className="text-xs text-muted-foreground font-mono">{data.topAngebot.vin}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{data.topAngebot.grund}</p>
          </div>

          {/* Empfehlung */}
          <div className="bg-subtle border border-emerald-500/20 rounded-xl p-3">
            <div className="text-[10px] font-medium text-emerald-500/70 uppercase tracking-wide mb-1.5">
              Empfehlung
            </div>
            <p className="text-sm text-foreground/80 leading-snug">{data.empfehlung}</p>
          </div>

          {/* Warnung */}
          <div className={`bg-subtle border rounded-xl p-3 ${data.warnung ? 'border-red-500/20' : 'border-border'}`}>
            <div className={`text-[10px] font-medium uppercase tracking-wide mb-1.5 ${data.warnung ? 'text-red-500/70' : 'text-subtle-foreground'}`}>
              Warnung
            </div>
            <p className="text-sm text-foreground/80 leading-snug">
              {data.warnung ?? 'Keine auffälligen Angebote.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
