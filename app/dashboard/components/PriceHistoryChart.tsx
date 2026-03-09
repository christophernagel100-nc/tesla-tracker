'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
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
  const padding = (maxPrice - minPrice) * 0.25 || 2000
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

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            {vinMeta.map((meta) => {
              const id = `grad-${meta.suffix.replace('…', '')}`
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              )
            })}
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            domain={[yMin, yMax]}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          />

          {vinMeta.map((meta) => {
            const isHidden = hiddenVins.has(meta.suffix)
            const isActive = hoveredVin === null || hoveredVin === meta.suffix
            const opacity = isHidden ? 0 : isActive ? 1 : 0.2
            const gradId = `grad-${meta.suffix.replace('…', '')}`

            return (
              <Area
                key={meta.suffix}
                type="monotoneX"
                dataKey={meta.suffix}
                stroke={meta.color}
                strokeWidth={isActive && !isHidden ? 1.75 : 1}
                strokeOpacity={opacity}
                fill={`url(#${gradId})`}
                fillOpacity={opacity}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: meta.color,
                  stroke: 'rgba(0,0,0,0.8)',
                  strokeWidth: 2,
                  style: { filter: `drop-shadow(0 0 6px ${meta.color})` },
                }}
                connectNulls
                name={`${meta.location} (${meta.suffix})`}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legende */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {vinMeta.map((meta) => {
          const isHidden = hiddenVins.has(meta.suffix)
          return (
            <button
              key={meta.suffix}
              onClick={() => toggle(meta.suffix)}
              onMouseEnter={() => setHoveredVin(meta.suffix)}
              onMouseLeave={() => setHoveredVin(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12px',
                color: isHidden ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 0',
                transition: 'color 0.15s',
              }}
            >
              <span style={{
                width: '20px',
                height: '2px',
                borderRadius: '1px',
                background: isHidden ? 'rgba(255,255,255,0.15)' : meta.color,
                transition: 'background 0.15s',
              }} />
              <span>{meta.location}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>{meta.suffix}</span>
            </button>
          )
        })}
      </div>

      {/* Preisänderungen */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
