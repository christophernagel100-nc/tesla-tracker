'use client'

import { useState } from 'react'
import { formatPrice, formatKm, formatRegistration } from '@/lib/utils'
import { calcBuyScore } from '@/lib/scoring'
import BuyScore from './BuyScore'
import type { TeslaCurrentListing } from '@/lib/types'

interface Props {
  listings: TeslaCurrentListing[]
  avgPrice: number
  onSelectVin: (vin: string) => void
}

type SortKey = 'price' | 'odometer_km' | 'registration_year' | 'days_on_market' | 'score'
type SortDir = 'asc' | 'desc'

export default function ListingsTable({ listings, avgPrice, onSelectVin }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('price')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const scoredListings = listings.map(l => ({ ...l, scoreResult: calcBuyScore(l, avgPrice) }))

  const sorted = [...scoredListings].sort((a, b) => {
    let av: number, bv: number
    if (sortKey === 'score') { av = a.scoreResult.score; bv = b.scoreResult.score }
    else { av = (a[sortKey] as number) || 0; bv = (b[sortKey] as number) || 0 }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="text-left text-xs font-medium text-subtle-foreground pb-3 cursor-pointer select-none hover:text-muted-foreground transition-colors whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  if (listings.length === 0) {
    return (
      <div className="card p-8 text-center text-subtle-foreground text-sm">
        Noch keine Listings — n8n Workflow läuft 3x täglich
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-sm font-medium text-muted-foreground">
          Aktuelle Angebote <span className="text-subtle-foreground font-normal ml-1">({listings.length})</span>
        </h2>
        {/* Mobile Sort-Dropdown */}
        <div className="sm:hidden">
          <select
            value={`${sortKey}-${sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split('-') as [SortKey, SortDir]
              setSortKey(key)
              setSortDir(dir)
            }}
            className="text-xs bg-input border border-border rounded-lg px-2 py-1.5 text-muted-foreground appearance-none"
          >
            <option value="price-asc">Preis ↑</option>
            <option value="price-desc">Preis ↓</option>
            <option value="score-desc">Score ↓</option>
            <option value="odometer_km-asc">km ↑</option>
            <option value="registration_year-desc">Neueste</option>
            <option value="days_on_market-desc">Online ↓</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {sorted.map((listing) => (
          <div
            key={listing.vin}
            className="p-3 rounded-xl bg-subtle border border-border active:bg-muted transition-colors cursor-pointer"
            onClick={() => onSelectVin(listing.vin)}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <BuyScore result={listing.scoreResult} compact />
                <span className="text-sm text-muted-foreground">{listing.location || '–'}</span>
              </div>
              <span className="text-sm font-medium text-foreground tabular-nums">{formatPrice(listing.price)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="tabular-nums">{formatRegistration(listing.registration_month, listing.registration_year)}</span>
              <span className="text-subtle-foreground">·</span>
              <span className="tabular-nums">{formatKm(listing.odometer_km)}</span>
              <span className="text-subtle-foreground">·</span>
              {listing.has_towbar && <span className="text-emerald-400">AHK</span>}
              {listing.has_damage_history && <span className="text-amber-400">⚠ Rep.</span>}
              {!listing.has_towbar && !listing.has_damage_history && <span className="text-subtle-foreground">–</span>}
              <span className="ml-auto tabular-nums">{listing.days_on_market === 0 ? '?' : `${listing.days_on_market}d`}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <SortHeader k="score">Score</SortHeader>
              <th className="text-left text-xs font-medium text-subtle-foreground pb-3">Standort</th>
              <SortHeader k="registration_year">Zulassung</SortHeader>
              <SortHeader k="odometer_km">km-Stand</SortHeader>
              <SortHeader k="price">Preis</SortHeader>
              <th className="text-left text-xs font-medium text-subtle-foreground pb-3">AHK</th>
              <th className="text-left text-xs font-medium text-subtle-foreground pb-3">Repariert</th>
              <SortHeader k="days_on_market">Online</SortHeader>
              <th className="text-left text-xs font-medium text-subtle-foreground pb-3">VIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((listing) => (
              <tr
                key={listing.vin}
                className="hover:bg-subtle cursor-pointer transition-colors"
                onClick={() => onSelectVin(listing.vin)}
              >
                <td className="py-3 pr-4"><BuyScore result={listing.scoreResult} /></td>
                <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">{listing.location || '–'}</td>
                <td className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">
                  {formatRegistration(listing.registration_month, listing.registration_year)}
                </td>
                <td className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">{formatKm(listing.odometer_km)}</td>
                <td className="py-3 pr-4 text-sm font-medium text-foreground tabular-nums">{formatPrice(listing.price)}</td>
                <td className="py-3 pr-4 text-xs">
                  {listing.has_towbar ? <span className="text-emerald-400">✓</span> : <span className="text-subtle-foreground">–</span>}
                </td>
                <td className="py-3 pr-4 text-xs">
                  {listing.has_damage_history ? <span className="text-amber-400">⚠</span> : <span className="text-subtle-foreground">–</span>}
                </td>
                <td className="py-3 pr-4 text-sm text-muted-foreground tabular-nums">
                  {listing.days_on_market === 0 ? '?' : `${listing.days_on_market}d`}
                </td>
                <td className="py-3 text-xs text-subtle-foreground font-mono">{listing.vin.slice(-6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
