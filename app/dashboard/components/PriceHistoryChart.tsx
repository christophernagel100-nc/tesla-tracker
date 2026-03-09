'use client'

import { useMemo } from 'react'
import {
  LineChart, Line, YAxis,
  ResponsiveContainer,
} from 'recharts'
import { formatPrice } from '@/lib/utils'
import type { VinMeta, PriceChangeWithLocation } from '@/lib/queries'

interface Props {
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
  recentChanges?: PriceChangeWithLocation[]
}

interface VehicleCard {
  suffix: string
  location: string
  color: string
  currentPrice: number
  firstPrice: number
  totalDelta: number
  totalDeltaPct: number
  sparkData: { price: number }[]
}

export default function PriceHistoryChart({ chartData, vinMeta, recentChanges = [] }: Props) {
  // Pro Fahrzeug: Sparkline-Daten, aktueller Preis, Delta berechnen
  const vehicles = useMemo<VehicleCard[]>(() => {
    return vinMeta.map(meta => {
      const prices = chartData
        .map(d => d[meta.suffix] as number)
        .filter(p => p !== undefined && p !== null)

      const currentPrice = prices[prices.length - 1] || 0
      const firstPrice = prices[0] || currentPrice
      const totalDelta = currentPrice - firstPrice
      const totalDeltaPct = firstPrice > 0 ? (totalDelta / firstPrice) * 100 : 0

      return {
        suffix: meta.suffix,
        location: meta.location,
        color: meta.color,
        currentPrice,
        firstPrice,
        totalDelta,
        totalDeltaPct,
        sparkData: prices.map(p => ({ price: p })),
      }
    })
    // Sortieren: größte Preissenkung zuerst
    .sort((a, b) => a.totalDelta - b.totalDelta)
  }, [chartData, vinMeta])

  if (chartData.length === 0 || vinMeta.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-medium text-white/50 mb-4">Preisverlauf</h2>
        <div className="h-52 flex items-center justify-center text-white/25 text-sm">
          Noch keine Daten — Tracking läuft 3x täglich
        </div>
      </div>
    )
  }

  const allPrices = vehicles.map(v => v.currentPrice).filter(Boolean)
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)

  return (
    <div className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-medium text-white/85 tracking-tight">
            Preisverlauf
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            {vinMeta.length} Fahrzeuge · {chartData.length} Tage · sortiert nach Preisänderung
          </p>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-medium text-white/55 tabular-nums">
            {formatPrice(minPrice)} – {formatPrice(maxPrice)}
          </div>
          <div className="text-xs text-white/30 mt-px">Spanne</div>
        </div>
      </div>

      {/* Sparkline Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {vehicles.map((vehicle) => {
          const hasDrop = vehicle.totalDelta < 0
          const hasRise = vehicle.totalDelta > 0
          const sparkMin = Math.min(...vehicle.sparkData.map(d => d.price))
          const sparkMax = Math.max(...vehicle.sparkData.map(d => d.price))
          const sparkPad = (sparkMax - sparkMin) * 0.2 || 100

          return (
            <div
              key={vehicle.suffix}
              className="relative overflow-hidden rounded-xl transition-colors"
              style={{
                background: hasDrop
                  ? 'rgba(16,185,129,0.04)'
                  : hasRise
                    ? 'rgba(239,68,68,0.03)'
                    : 'rgba(255,255,255,0.02)',
                border: `1px solid ${hasDrop
                  ? 'rgba(16,185,129,0.1)'
                  : hasRise
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(255,255,255,0.04)'}`,
                padding: '14px 16px 10px',
              }}
            >
              {/* Obere Zeile: Standort + VIN */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: vehicle.color, boxShadow: `0 0 6px ${vehicle.color}40` }}
                  />
                  <span className="text-[13px] text-white/65 font-medium truncate">
                    {vehicle.location}
                  </span>
                </div>
                <span className="text-[11px] text-white/20 font-mono ml-2 flex-shrink-0">
                  {vehicle.suffix}
                </span>
              </div>

              {/* Preis + Delta */}
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-semibold text-white/90 tabular-nums tracking-tight">
                  {formatPrice(vehicle.currentPrice)}
                </span>
                {vehicle.totalDelta !== 0 && (
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: hasDrop ? '#10b981' : '#ef4444' }}
                  >
                    {hasDrop ? '' : '+'}{vehicle.totalDelta.toLocaleString('de-DE')} €
                    <span className="ml-1 opacity-60">
                      ({vehicle.totalDeltaPct > 0 ? '+' : ''}{vehicle.totalDeltaPct.toFixed(1)}%)
                    </span>
                  </span>
                )}
                {vehicle.totalDelta === 0 && (
                  <span className="text-xs text-white/20">stabil</span>
                )}
              </div>

              {/* Sparkline */}
              <div className="mt-2 -mx-2 -mb-1">
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={vehicle.sparkData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                    <YAxis
                      hide
                      domain={[sparkMin - sparkPad, sparkMax + sparkPad]}
                    />
                    <Line
                      type="monotoneX"
                      dataKey="price"
                      stroke={hasDrop ? '#10b981' : hasRise ? '#ef4444' : 'rgba(255,255,255,0.25)'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preisänderungen Detail-Liste */}
      {recentChanges.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-xs text-white/35 mb-3 tracking-wide">
            Letzte Preisänderungen
          </div>
          <div className="flex flex-col gap-1.5">
            {recentChanges.slice(0, 8).map((change) => {
              const isDown = change.delta < 0
              const pct = ((change.delta / change.price_before) * 100).toFixed(1)
              const vinSuffix = `…${change.vin.slice(-4)}`

              return (
                <div
                  key={change.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-[13px]"
                  style={{
                    background: isDown ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${isDown ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}`,
                  }}
                >
                  {/* Links: Standort */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{isDown ? '📉' : '📈'}</span>
                    <span className="text-white/60 truncate">{change.location || '–'}</span>
                    <span className="text-[11px] text-white/20 flex-shrink-0">{vinSuffix}</span>
                  </div>
                  {/* Rechts: Preise + Delta */}
                  <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
                    <span className="text-white/30 text-xs hidden sm:inline">{formatPrice(change.price_before)}</span>
                    <span className="text-white/20 hidden sm:inline">→</span>
                    <span className="text-white/90 font-medium">{formatPrice(change.price_after)}</span>
                    <span
                      className="text-xs font-medium min-w-[52px] text-right"
                      style={{ color: isDown ? '#10b981' : '#ef4444' }}
                    >
                      {isDown ? '' : '+'}{change.delta.toLocaleString('de-DE')} € ({pct}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
