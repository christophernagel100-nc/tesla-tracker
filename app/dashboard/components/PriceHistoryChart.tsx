'use client'

import { useMemo } from 'react'
import {
  LineChart, Line, YAxis,
  ResponsiveContainer,
} from 'recharts'
import { formatPrice, formatKm } from '@/lib/utils'
import type { VinMeta, PriceChangeWithLocation } from '@/lib/queries'
import type { TeslaCurrentListing, ListingSource } from '@/lib/types'
import { SOURCE_COLORS, SOURCE_LABELS } from '@/lib/types'

interface Props {
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
  recentChanges?: PriceChangeWithLocation[]
  listings?: TeslaCurrentListing[]
  onSelectVin?: (vin: string) => void
}

interface VehicleCard {
  vin: string
  suffix: string
  location: string
  color: string
  source: ListingSource
  currentPrice: number
  firstPrice: number
  totalDelta: number
  totalDeltaPct: number
  odometerKm: number | null
  isSold: boolean
  sparkData: { price: number }[]
}

export default function PriceHistoryChart({ chartData, vinMeta, recentChanges = [], listings = [], onSelectVin }: Props) {
  // Odometer + Sold-Map aus Listings
  const odometerMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const l of listings) map.set(l.vin, l.odometer_km)
    return map
  }, [listings])

  const soldSet = useMemo(() => {
    const set = new Set<string>()
    for (const l of listings) { if (l.is_sold) set.add(l.vin) }
    return set
  }, [listings])

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
        vin: meta.vin,
        suffix: meta.suffix,
        location: meta.location,
        color: meta.color,
        source: meta.source,
        currentPrice,
        firstPrice,
        totalDelta,
        totalDeltaPct,
        odometerKm: odometerMap.get(meta.vin) ?? null,
        isSold: soldSet.has(meta.vin),
        sparkData: prices.map(p => ({ price: p })),
      }
    })
    // Sortieren: Verkaufte ans Ende, dann größte Preissenkung zuerst
    .sort((a, b) => {
      if (a.isSold !== b.isSold) return a.isSold ? 1 : -1
      return a.totalDelta - b.totalDelta
    })
  }, [chartData, vinMeta, odometerMap, soldSet])

  if (chartData.length === 0 || vinMeta.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Preisverlauf</h2>
        <div className="h-52 flex items-center justify-center text-subtle-foreground text-sm">
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
          <h2 className="text-[15px] font-medium text-foreground/85 tracking-tight">
            Preisverlauf
          </h2>
          <p className="text-xs text-subtle-foreground mt-0.5">
            {vinMeta.length} Fahrzeuge · {chartData.length} Tage · sortiert nach Preisänderung
          </p>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-medium text-muted-foreground tabular-nums">
            {formatPrice(minPrice)} – {formatPrice(maxPrice)}
          </div>
          <div className="text-xs text-subtle-foreground mt-px">Spanne</div>
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
              className={`relative overflow-hidden rounded-xl transition-colors ${vehicle.isSold ? 'opacity-40' : ''} ${onSelectVin ? 'cursor-pointer hover:brightness-110 dark:hover:brightness-125' : ''}`}
              onClick={() => onSelectVin?.(vehicle.vin)}
              style={{
                background: vehicle.isSold
                  ? 'var(--subtle)'
                  : hasDrop
                    ? 'rgba(16,185,129,0.04)'
                    : hasRise
                      ? 'rgba(239,68,68,0.03)'
                      : 'var(--subtle)',
                border: `1px solid ${vehicle.isSold
                  ? 'var(--border)'
                  : hasDrop
                    ? 'rgba(16,185,129,0.1)'
                    : hasRise
                      ? 'rgba(239,68,68,0.06)'
                      : 'var(--border)'}`,
                padding: '14px 16px 10px',
              }}
            >
              {/* Obere Zeile: Source + Standort + VIN */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SOURCE_COLORS[vehicle.source], boxShadow: `0 0 6px ${SOURCE_COLORS[vehicle.source]}40` }}
                  />
                  <span className="text-[13px] text-muted-foreground font-medium truncate">
                    {vehicle.location}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span
                    className="text-[10px] font-medium px-1 py-px rounded"
                    style={{
                      color: SOURCE_COLORS[vehicle.source],
                      background: `${SOURCE_COLORS[vehicle.source]}10`,
                    }}
                  >
                    {SOURCE_LABELS[vehicle.source]}
                  </span>
                  {vehicle.odometerKm != null && (
                    <span className="text-[11px] text-subtle-foreground tabular-nums">
                      {formatKm(vehicle.odometerKm)}
                    </span>
                  )}
                  <span className="text-[11px] text-subtle-foreground/70 font-mono">
                    {vehicle.suffix}
                  </span>
                </div>
              </div>

              {/* Preis + Delta */}
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-lg font-semibold tabular-nums tracking-tight ${vehicle.isSold ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {formatPrice(vehicle.currentPrice)}
                </span>
                {vehicle.isSold && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                    Verkauft
                  </span>
                )}
                {vehicle.totalDelta !== 0 && (
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: hasDrop ? 'var(--chart-3)' : 'var(--chart-5)' }}
                  >
                    {hasDrop ? '' : '+'}{vehicle.totalDelta.toLocaleString('de-DE')} €
                    <span className="ml-1 opacity-60">
                      ({vehicle.totalDeltaPct > 0 ? '+' : ''}{vehicle.totalDeltaPct.toFixed(1)}%)
                    </span>
                  </span>
                )}
                {vehicle.totalDelta === 0 && (
                  <span className="text-xs text-subtle-foreground">stabil</span>
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
                      stroke={hasDrop ? 'var(--chart-3)' : hasRise ? 'var(--chart-5)' : 'var(--muted-foreground)'}
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
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-xs text-subtle-foreground mb-3 tracking-wide">
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
                  {/* Links: Source + Standort */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{isDown ? '📉' : '📈'}</span>
                    {change.source && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: SOURCE_COLORS[change.source] }}
                        title={SOURCE_LABELS[change.source]}
                      />
                    )}
                    <span className="text-muted-foreground truncate">{change.location || '–'}</span>
                    <span className="text-[11px] text-subtle-foreground flex-shrink-0">{vinSuffix}</span>
                  </div>
                  {/* Rechts: Preise + Delta */}
                  <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
                    <span className="text-subtle-foreground text-xs hidden sm:inline">{formatPrice(change.price_before)}</span>
                    <span className="text-subtle-foreground/70 hidden sm:inline">→</span>
                    <span className="text-foreground font-medium">{formatPrice(change.price_after)}</span>
                    <span
                      className="text-xs font-medium min-w-[52px] text-right"
                      style={{ color: isDown ? 'var(--chart-3)' : 'var(--chart-5)' }}
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
