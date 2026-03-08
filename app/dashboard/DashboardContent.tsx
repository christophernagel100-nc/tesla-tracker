'use client'

import { useState } from 'react'
import type { TeslaCurrentListing, TeslaPriceChange, DashboardStats } from '@/lib/types'
import type { VinMeta } from '@/lib/queries'
import { getDaysUntil } from '@/lib/utils'
import KpiCards from './components/KpiCards'
import CountdownBanner from './components/CountdownBanner'
import PriceHistoryChart from './components/PriceHistoryChart'
import ListingsTable from './components/ListingsTable'
import VinDetailModal from './components/VinDetailModal'

interface Props {
  listings: TeslaCurrentListing[]
  stats: DashboardStats
  vinPriceHistory: { chartData: Record<string, number | string>[]; vinMeta: VinMeta[] }
  recentChanges: TeslaPriceChange[]
}

export default function DashboardContent({ listings, stats, vinPriceHistory, recentChanges }: Props) {
  const [selectedVin, setSelectedVin] = useState<string | null>(null)
  const selectedListing = listings.find(l => l.vin === selectedVin) || null

  const KAUFZIEL = new Date('2026-03-25')
  const daysUntil = getDaysUntil(KAUFZIEL)
  const showCountdown = daysUntil > 0

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="dashboard-gradient-orb-1" />
      <div className="dashboard-gradient-orb-2" />
      <div className="noise-overlay" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white/95">
              Tesla Model Y <span className="gradient-text">Performance</span>
            </h1>
            <p className="text-sm text-white/45 mt-1">Preismonitor — DE Gebrauchtmarkt</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30">Aktualisiert 3x täglich</div>
            <div className="text-xs text-white/20">08:00 · 13:00 · 19:00</div>
          </div>
        </div>

        {/* Countdown Banner */}
        {showCountdown && <CountdownBanner daysUntil={daysUntil} />}

        {/* KPI Cards */}
        <KpiCards stats={stats} />

        {/* Price History Chart */}
        <PriceHistoryChart chartData={vinPriceHistory.chartData} vinMeta={vinPriceHistory.vinMeta} />

        {/* Listings Table */}
        <ListingsTable
          listings={listings}
          avgPrice={stats.avgPrice}
          onSelectVin={setSelectedVin}
        />
      </div>

      {/* Detail Modal */}
      {selectedVin && selectedListing && (
        <VinDetailModal
          listing={selectedListing}
          avgPrice={stats.avgPrice}
          onClose={() => setSelectedVin(null)}
        />
      )}
    </div>
  )
}
