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
    { label: 'Anhängerkupplung', value: listing.has_towbar ? 'Ja' : '–' },
    { label: 'Repariert', value: listing.has_damage_history ? 'Ja ⚠' : '–' },
    { label: 'Erstmals gesehen', value: formatDate(listing.first_seen) },
    { label: 'Online seit', value: listing.days_on_market === 0 ? 'Neu' : `${listing.days_on_market} Tage` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 dark:bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Model Y Performance</h2>
            <p className="text-xs text-subtle-foreground font-mono mt-0.5">{listing.vin}</p>
          </div>
          <button className="text-subtle-foreground hover:text-foreground/70 transition-colors p-1" onClick={onClose}>✕</button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <BuyScore result={scoreResult} />
          <div className="text-xs text-subtle-foreground">{scoreResult.reasons.join(' · ')}</div>
        </div>

        {/* Price Sparkline */}
        {historyData.length > 1 && (
          <div>
            <div className="text-xs text-subtle-foreground mb-2">Preisverlauf</div>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={historyData}>
                <Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(v) => (typeof v === 'number' ? formatPrice(v) : String(v))}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-2">
          {fields.map(f => (
            <div key={f.label} className="bg-subtle rounded-xl p-3">
              <div className="text-xs text-subtle-foreground mb-0.5">{f.label}</div>
              <div className="text-sm text-foreground/80 font-medium truncate">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Link */}
        {listing.listing_url && (
          <a
            href={listing.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-xl border border-accent text-sm text-primary hover:bg-accent/30 transition-colors"
          >
            Auf Tesla.com ansehen →
          </a>
        )}
      </div>
    </div>
  )
}
