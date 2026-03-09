'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceDot,
} from 'recharts'
import { formatPrice } from '@/lib/utils'
import type { VinMeta, PriceChangeWithLocation } from '@/lib/queries'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
  recentChanges?: PriceChangeWithLocation[]
}

// Stroke-Dash-Patterns für bessere visuelle Unterscheidung
const DASH_PATTERNS = [
  '0',           // solid
  '8 4',         // dashed
  '2 3',         // dotted
  '12 4 2 4',    // dash-dot
  '0',           // solid
  '6 3',         // short dash
  '2 2',         // fine dot
  '10 3 3 3',    // dash-dot-dot
  '0',           // solid
  '4 4',         // even dash
]

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const sorted = [...payload]
    .filter(p => p.value !== undefined && p.value !== null)
    .sort((a, b) => a.value - b.value)

  return (
    <div
      style={{
        background: 'rgba(10,10,18,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '12px 16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: '200px',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '10px', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {sorted.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', gap: '20px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0, boxShadow: `0 0 6px ${p.color}` }} />
            {p.name}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '13px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
            {formatPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PriceHistoryChart({ chartData, vinMeta, recentChanges = [] }: Props) {
  const [hoveredVin, setHoveredVin] = useState<string | null>(null)
  const [hiddenVins, setHiddenVins] = useState<Set<string>>(new Set())

  // Preisänderungs-Dots für den Chart berechnen
  const changeDots = useMemo(() => {
    if (!recentChanges.length || !chartData.length) return []
    return recentChanges.map(change => {
      const dateStr = format(new Date(change.changed_at), 'dd.MM')
      const vinSuffix = `…${change.vin.slice(-4)}`
      const dataPoint = chartData.find(d => d.date === dateStr)
      if (!dataPoint || !dataPoint[vinSuffix]) return null
      return { date: dateStr, suffix: vinSuffix, price: dataPoint[vinSuffix] as number, delta: change.delta }
    }).filter(Boolean) as { date: string; suffix: string; price: number; delta: number }[]
  }, [recentChanges, chartData])

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

  const toggle = (suffix: string) => {
    setHiddenVins(prev => {
      const next = new Set(prev)
      next.has(suffix) ? next.delete(suffix) : next.add(suffix)
      return next
    })
  }

  const allPrices = chartData.flatMap(d =>
    vinMeta.map(m => d[m.suffix] as number).filter(Boolean)
  )
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const padding = (maxPrice - minPrice) * 0.15 || 2000
  const yMin = Math.floor((minPrice - padding) / 1000) * 1000
  const yMax = Math.ceil((maxPrice + padding) / 1000) * 1000

  return (
    <div className="card p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
            Preisverlauf
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            {vinMeta.length} Fahrzeuge · {chartData.length} Tage
          </p>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500 }}>
            {formatPrice(minPrice)} – {formatPrice(maxPrice)}
          </div>
          <div style={{ marginTop: '1px' }}>Spanne</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            domain={[yMin, yMax]}
            width={36}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          />

          {vinMeta.map((meta, i) => {
            const isHidden = hiddenVins.has(meta.suffix)
            const isHovered = hoveredVin === meta.suffix
            const isActive = hoveredVin === null || isHovered
            const opacity = isHidden ? 0 : isActive ? 1 : 0.12

            return (
              <Line
                key={meta.suffix}
                type="monotoneX"
                dataKey={meta.suffix}
                stroke={meta.color}
                strokeWidth={isHovered ? 3 : 2}
                strokeOpacity={opacity}
                strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                dot={false}
                activeDot={{
                  r: isHovered ? 6 : 4,
                  fill: meta.color,
                  stroke: 'rgba(0,0,0,0.8)',
                  strokeWidth: 2,
                  style: { filter: `drop-shadow(0 0 8px ${meta.color})` },
                }}
                connectNulls
                name={`${meta.location} (${meta.suffix})`}
              />
            )
          })}

          {/* Preisänderungs-Marker im Chart */}
          {changeDots.map((dot, i) => {
            const meta = vinMeta.find(m => m.suffix === dot.suffix)
            if (!meta || hiddenVins.has(dot.suffix)) return null
            return (
              <ReferenceDot
                key={`change-${i}`}
                x={dot.date}
                y={dot.price}
                r={5}
                fill={dot.delta < 0 ? '#10b981' : '#ef4444'}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={2}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legende — aktueller Preis rechts angezeigt */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {vinMeta.map((meta, i) => {
          const isHidden = hiddenVins.has(meta.suffix)
          const isHovered = hoveredVin === meta.suffix
          // Aktueller Preis = letzter Datenpunkt
          const lastPoint = chartData[chartData.length - 1]
          const currentPrice = lastPoint?.[meta.suffix] as number | undefined
          // Vorheriger Preis = vorletzter Datenpunkt
          const prevPoint = chartData.length > 1 ? chartData[chartData.length - 2] : null
          const prevPrice = prevPoint?.[meta.suffix] as number | undefined
          const priceDelta = currentPrice && prevPrice ? currentPrice - prevPrice : 0

          return (
            <button
              key={meta.suffix}
              onClick={() => toggle(meta.suffix)}
              onMouseEnter={() => setHoveredVin(meta.suffix)}
              onMouseLeave={() => setHoveredVin(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12px',
                color: isHidden ? 'rgba(255,255,255,0.15)' : isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                background: isHovered ? 'rgba(255,255,255,0.03)' : 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {/* Farbige Linie mit Dash-Pattern */}
              <svg width="24" height="2" style={{ flexShrink: 0 }}>
                <line
                  x1="0" y1="1" x2="24" y2="1"
                  stroke={isHidden ? 'rgba(255,255,255,0.15)' : meta.color}
                  strokeWidth="2"
                  strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length] || '0'}
                />
              </svg>
              <span style={{ minWidth: '140px' }}>{meta.location}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>{meta.suffix}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: isHidden ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)' }}>
                {currentPrice ? formatPrice(currentPrice) : '–'}
              </span>
              {priceDelta !== 0 && !isHidden && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: priceDelta < 0 ? '#10b981' : '#ef4444',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '60px',
                  textAlign: 'right',
                }}>
                  {priceDelta < 0 ? '' : '+'}{priceDelta.toLocaleString('de-DE')} €
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Preisänderungen Detail-Liste */}
      {recentChanges.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', letterSpacing: '0.03em' }}>
            Letzte Preisänderungen
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentChanges.slice(0, 8).map((change) => {
              const isDown = change.delta < 0
              const pct = ((change.delta / change.price_before) * 100).toFixed(1)
              const vinSuffix = `…${change.vin.slice(-4)}`
              const dateStr = format(new Date(change.changed_at), 'dd.MM. HH:mm', { locale: de })

              return (
                <div
                  key={change.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isDown ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${isDown ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}`,
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '0 0 auto' }}>
                    <span style={{ fontSize: '14px' }}>{isDown ? '📉' : '📈'}</span>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {change.location || '–'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '6px', fontSize: '11px' }}>
                        {vinSuffix}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      {formatPrice(change.price_before)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(change.price_after)}
                    </span>
                    <span style={{
                      color: isDown ? '#10b981' : '#ef4444',
                      fontWeight: 500,
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '52px',
                      textAlign: 'right',
                    }}>
                      {isDown ? '' : '+'}{change.delta.toLocaleString('de-DE')} € ({pct}%)
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginLeft: '8px' }}>
                    {dateStr}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
