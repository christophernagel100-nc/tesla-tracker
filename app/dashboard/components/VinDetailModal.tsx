'use client'

import { useEffect, useState } from 'react'
import { formatPrice, formatKm, formatRegistration, formatDate } from '@/lib/utils'
import { calcBuyScore } from '@/lib/scoring'
import BuyScore from './BuyScore'
import type { TeslaCurrentListing, ListingSource } from '@/lib/types'
import { SOURCE_COLORS, SOURCE_LABELS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  listing: TeslaCurrentListing
  allListings?: TeslaCurrentListing[]
  avgPrice: number
  onClose: () => void
}

export default function VinDetailModal({ listing, allListings = [], avgPrice, onClose }: Props) {
  const [history, setHistory] = useState<{ fetched_at: string; price: number; source: string }[]>([])
  const scoreResult = calcBuyScore(listing, avgPrice)

  // Find cross-source listings for same VIN (only real VINs)
  const crossSourceListings = listing.vin.startsWith('NVIN-')
    ? []
    : allListings.filter(l => l.vin === listing.vin && l.source !== listing.source)

  useEffect(() => {
    const client = createClient()
    client
      .from('tesla_snapshots')
      .select('fetched_at, price, source')
      .eq('vin', listing.vin)
      .order('fetched_at', { ascending: true })
      .then(({ data }) => { if (data) setHistory(data as { fetched_at: string; price: number; source: string }[]) })
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
    { label: 'VIN', value: listing.vin.startsWith('NVIN-') ? `Anzeige ${listing.source_listing_id}` : listing.vin },
    { label: 'Preis', value: formatPrice(listing.price) },
    { label: 'Quelle', value: SOURCE_LABELS[listing.source] },
    { label: 'Erstzulassung', value: formatRegistration(listing.registration_month, listing.registration_year) },
    { label: 'Kilometerstand', value: formatKm(listing.odometer_km) },
    { label: 'Standort', value: listing.location || '–' },
    { label: 'Anhängerkupplung', value: listing.has_towbar ? 'Ja' : '–' },
    { label: 'Repariert', value: listing.has_damage_history ? 'Ja' : '–' },
    { label: 'Erstmals gesehen', value: formatDate(listing.first_seen) },
    { label: 'Online seit', value: listing.days_on_market === 0 ? 'Neu' : `${listing.days_on_market} Tage` },
  ]

  const sourceLinkLabel: Record<ListingSource, string> = {
    'tesla.com': 'Auf Tesla.com ansehen',
    'mobile.de': 'Auf mobile.de ansehen',
    'kleinanzeigen.de': 'Auf Kleinanzeigen ansehen',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 dark:bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Model Y Performance</h2>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  background: `${SOURCE_COLORS[listing.source]}15`,
                  color: SOURCE_COLORS[listing.source],
                  border: `1px solid ${SOURCE_COLORS[listing.source]}25`,
                }}
              >
                {SOURCE_LABELS[listing.source]}
              </span>
            </div>
            <p className="text-xs text-subtle-foreground font-mono mt-0.5">
              {listing.vin.startsWith('NVIN-') ? `ID: ${listing.source_listing_id}` : listing.vin}
            </p>
          </div>
          <button className="text-subtle-foreground hover:text-foreground/70 transition-colors p-1" onClick={onClose}>✕</button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3">
          <BuyScore result={scoreResult} />
          <div className="text-xs text-subtle-foreground">{scoreResult.reasons.join(' · ')}</div>
        </div>

        {/* Cross-Source Prices */}
        {crossSourceListings.length > 0 && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <div className="text-xs text-muted-foreground font-medium">Preisvergleich über Plattformen</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: SOURCE_COLORS[listing.source] }}>{SOURCE_LABELS[listing.source]}</span>
                <span className="font-medium text-foreground tabular-nums">{formatPrice(listing.price)}</span>
              </div>
              {crossSourceListings.map(cl => (
                <div key={cl.source} className="flex items-center justify-between text-sm">
                  <span style={{ color: SOURCE_COLORS[cl.source] }}>{SOURCE_LABELS[cl.source]}</span>
                  <span className="font-medium text-foreground tabular-nums">{formatPrice(cl.price)}</span>
                </div>
              ))}
              {crossSourceListings.map(cl => {
                const diff = listing.price - cl.price
                if (diff === 0) return null
                return (
                  <div key={`diff-${cl.source}`} className="text-xs text-subtle-foreground mt-1">
                    Differenz: <span className={diff > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {diff > 0 ? `${cl.source} ist ${formatPrice(Math.abs(diff))} günstiger` : `${listing.source} ist ${formatPrice(Math.abs(diff))} günstiger`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

        {/* Links */}
        <div className="space-y-2">
          {listing.listing_url && (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-xl border text-sm transition-colors"
              style={{
                borderColor: `${SOURCE_COLORS[listing.source]}40`,
                color: SOURCE_COLORS[listing.source],
              }}
            >
              {sourceLinkLabel[listing.source]} →
            </a>
          )}
          {crossSourceListings.map(cl => cl.listing_url && (
            <a
              key={cl.source}
              href={cl.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 rounded-xl border text-xs transition-colors"
              style={{
                borderColor: `${SOURCE_COLORS[cl.source]}30`,
                color: SOURCE_COLORS[cl.source],
              }}
            >
              {sourceLinkLabel[cl.source]} →
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
