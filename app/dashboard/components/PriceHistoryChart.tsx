'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { formatPrice } from '@/lib/utils'

interface DataPoint { date: string; avg: number; min: number }
interface Props { data: DataPoint[] }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl p-3 text-sm">
      <div className="text-white/50 mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-white/60">{p.name === 'avg' ? 'Ø Preis' : 'Min. Preis'}</span>
          <span className="text-white/90 font-medium">{formatPrice(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function PriceHistoryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-medium text-white/50 mb-4">Preisverlauf</h2>
        <div className="h-48 flex items-center justify-center text-white/25 text-sm">
          Noch keine Daten — erstes Tracking läuft
        </div>
      </div>
    )
  }

  const formattedData = data.map(d => ({
    ...d,
    dateLabel: format(new Date(d.date), 'dd.MM', { locale: de }),
  }))

  return (
    <div className="card p-6">
      <h2 className="text-sm font-medium text-white/50 mb-6">Preisverlauf</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="dateLabel" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="avg" stroke="#d5bca2" strokeWidth={2} dot={false} name="avg" />
          <Line type="monotone" dataKey="min" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 2" name="min" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-6 mt-3 text-xs text-white/35">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#d5bca2] inline-block" />Ø Preis</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#6366f1] inline-block" />Min. Preis</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-[#10b981] inline-block" />25.03. Kaufbereit</span>
      </div>
    </div>
  )
}
