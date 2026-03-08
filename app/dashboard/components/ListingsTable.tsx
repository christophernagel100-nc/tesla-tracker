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
      className="text-left text-xs font-medium text-white/35 pb-3 cursor-pointer select-none hover:text-white/60 transition-colors whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  if (listings.length === 0) {
    return (
      <div className="card p-8 text-center text-white/30 text-sm">
        Noch keine Listings — n8n Workflow läuft 3x täglich
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-medium text-white/50">
          Aktuelle Angebote <span className="text-white/25 font-normal ml-1">({listings.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <SortHeader k="score">Score</SortHeader>
              <th className="text-left text-xs font-medium text-white/35 pb-3">Standort</th>
              <SortHeader k="registration_year">Zulassung</SortHeader>
              <SortHeader k="odometer_km">km-Stand</SortHeader>
              <SortHeader k="price">Preis</SortHeader>
              <th className="text-left text-xs font-medium text-white/35 pb-3">AHK</th>
              <th className="text-left text-xs font-medium text-white/35 pb-3">Schaden</th>
              <SortHeader k="days_on_market">Online</SortHeader>
              <th className="text-left text-xs font-medium text-white/35 pb-3">VIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.map((listing) => (
              <tr
                key={listing.vin}
                className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => onSelectVin(listing.vin)}
              >
                <td className="py-3 pr-4"><BuyScore result={listing.scoreResult} /></td>
                <td className="py-3 pr-4 text-sm text-white/60 whitespace-nowrap">{listing.location || '–'}</td>
                <td className="py-3 pr-4 text-sm text-white/60 tabular-nums">
                  {formatRegistration(listing.registration_month, listing.registration_year)}
                </td>
                <td className="py-3 pr-4 text-sm text-white/60 tabular-nums">{formatKm(listing.odometer_km)}</td>
                <td className="py-3 pr-4 text-sm font-medium text-white/90 tabular-nums">{formatPrice(listing.price)}</td>
                <td className="py-3 pr-4 text-xs">
                  {listing.has_towbar ? <span className="text-emerald-400">✓</span> : <span className="text-white/20">–</span>}
                </td>
                <td className="py-3 pr-4 text-xs">
                  {listing.has_damage_history ? <span className="text-red-400">!</span> : <span className="text-white/20">–</span>}
                </td>
                <td className="py-3 pr-4 text-sm text-white/40 tabular-nums">
                  {listing.days_on_market}d
                </td>
                <td className="py-3 text-xs text-white/25 font-mono">{listing.vin.slice(-6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
