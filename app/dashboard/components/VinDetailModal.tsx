'use client'

import { useEffect, useState } from 'react'
import { formatPrice, formatKm, formatRegistration, formatDate } from '@/lib/utils'
import { calcBuyScore } from '@/lib/scoring'
import BuyScore from './BuyScore'
import type { TeslaCurrentListing } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  listing: TeslaCurrentListing
  avgPrice: number
  onClose: () => void
}

export default function VinDetailModal({ listing, avgPrice, onClose }: Props) {
  const [history, setHistory] = useState<{ fetched_at: string; price: number }[]>([])
  const scoreResult = calcBuyScore(listing, avgPrice)

  useEffect(() => {
    const client = createClient()
    client
      .from('tesla_snapshots')
      .select('fetched_at, price')
      .eq('vin', listing.vin)
      .order('fetched_at', { ascending: true })
      .then(({ data }) => { if (data) setHistory(data as { fetched_at: string; price: number }[]) })
  }, [listing.vin])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const historyData = history.map(h => ({
    date: h.fetched_at.substring(5, 10),
    price: h.price,
  }))

  const fields = [
    { label: 'VIN', value: listing.vin },
    { label: 'Preis', value: formatPrice(listing.price) },
    { label: 'Erstzulassung', value: formatRegistration(listing.registration_month, listing.registration_year) },
    { label: 'Kilometerstand', value: formatKm(listing.odometer_km) },
    { label: 'Standort', value: listing.location || '–' },
    { label: 'Anhängerkupplung', value: listing.has_towbar ? 'Ja' : 'Nein' },
    { label: 'Schadenhistorie', value: listing.has_damage_history ? 'Ja ⚠️' : 'Nein' },
    { label: 'Erstmals gesehen', value: formatDate(listing.first_seen) },
    { label: 'Online seit', value: `${listing.days_on_market} Tage` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#0a0a12] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white/90">Model Y Performance</h2>
            <p className="text-xs text-white/35 font-mono mt-0.5">{listing.vin}</p>
          </div>
          <button className="text-white/30 hover:text-white/70 transition-colors p-1" onClick={onClose}>✕</button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <BuyScore result={scoreResult} />
          <div className="text-xs text-white/35">{scoreResult.reasons.join(' · ')}</div>
        </div>

        {/* Price Sparkline */}
        {historyData.length > 1 && (
          <div>
            <div className="text-xs text-white/35 mb-2">Preisverlauf</div>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={historyData}>
                <Line type="monotone" dataKey="price" stroke="#d5bca2" strokeWidth={2} dot={false} />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v) => (typeof v === 'number' ? formatPrice(v) : String(v))}
                  contentStyle={{ background: '#0a0a12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.4)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-2">
          {fields.map(f => (
            <div key={f.label} className="bg-white/[0.03] rounded-xl p-3">
              <div className="text-xs text-white/30 mb-0.5">{f.label}</div>
              <div className="text-sm text-white/80 font-medium truncate">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Link */}
        {listing.listing_url && (
          <a
            href={listing.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-xl border border-[rgba(213,188,162,0.2)] text-sm text-[#d5bca2] hover:bg-[rgba(213,188,162,0.05)] transition-colors"
          >
            Auf Tesla.com ansehen →
          </a>
        )}
      </div>
    </div>
  )
}
