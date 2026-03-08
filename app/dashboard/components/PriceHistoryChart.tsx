'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice } from '@/lib/utils'
import type { VinMeta } from '@/lib/queries'

interface Props {
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].filter(p => p.value !== undefined).sort((a, b) => a.value - b.value)
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl p-3 text-sm min-w-[180px]">
      <div className="text-white/50 mb-2 text-xs">{label}</div>
      {sorted.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 py-0.5">
          <span className="text-white/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-white/90 font-medium tabular-nums">{formatPrice(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function PriceHistoryChart({ chartData, vinMeta }: Props) {
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

  return (
    <div className="card p-6">
      <h2 className="text-sm font-medium text-white/50 mb-6">Preisverlauf alle Fahrzeuge</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          {vinMeta.map((meta) => (
            <Line
              key={meta.suffix}
              type="monotone"
              dataKey={meta.suffix}
              stroke={meta.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              name={`${meta.location} (${meta.suffix})`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legende */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
        {vinMeta.map((meta) => (
          <span key={meta.suffix} className="flex items-center gap-1.5 text-xs text-white/40">
            <span className="w-3 h-0.5 inline-block" style={{ background: meta.color }} />
            {meta.location} ({meta.suffix})
          </span>
        ))}
      </div>
    </div>
  )
}
