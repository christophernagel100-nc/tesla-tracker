'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import type { TeslaCurrentListing, DashboardStats } from '@/lib/types'
import type { VinMeta, PriceChangeWithLocation } from '@/lib/queries'
import { getDaysUntil } from '@/lib/utils'
import KpiCards from './components/KpiCards'
import CountdownBanner from './components/CountdownBanner'
import PriceHistoryChart from './components/PriceHistoryChart'
import ListingsTable from './components/ListingsTable'
import VinDetailModal from './components/VinDetailModal'
import MarketBriefing from './components/MarketBriefing'
import AiAdvisor from './components/AiAdvisor'

interface Props {
  listings: TeslaCurrentListing[]
  stats: DashboardStats
  vinPriceHistory: { chartData: Record<string, number | string>[]; vinMeta: VinMeta[] }
  recentChanges: PriceChangeWithLocation[]
}

export default function DashboardContent({ listings, stats, vinPriceHistory, recentChanges }: Props) {
  const [selectedVin, setSelectedVin] = useState<string | null>(null)
  const selectedListing = listings.find(l => l.vin === selectedVin) || null
  const { theme, setTheme } = useTheme()

  const KAUFZIEL = new Date('2026-03-25')
  const daysUntil = getDaysUntil(KAUFZIEL)
  const showCountdown = daysUntil > 0

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="dashboard-gradient-orb-1" />
      <div className="dashboard-gradient-orb-2" />
      <div className="noise-overlay" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tesla Model Y <span className="gradient-text">Performance</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Preismonitor — Tesla.com · mobile.de · Kleinanzeigen</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-subtle-foreground">Aktualisiert 3x täglich</div>
              <div className="text-xs text-subtle-foreground/70">08:00 · 13:00 · 19:00</div>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-card border border-border hover:border-accent-foreground transition-all duration-200 cursor-pointer"
              aria-label="Theme wechseln"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-primary" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Countdown Banner */}
        {showCountdown && <CountdownBanner daysUntil={daysUntil} />}

        {/* KPI Cards */}
        <KpiCards stats={stats} />

        {/* KI Marktanalyse */}
        <MarketBriefing />

        {/* Price History Chart */}
        <PriceHistoryChart chartData={vinPriceHistory.chartData} vinMeta={vinPriceHistory.vinMeta} recentChanges={recentChanges} listings={listings} onSelectVin={setSelectedVin} />

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
          allListings={listings}
          avgPrice={stats.avgPrice}
          onClose={() => setSelectedVin(null)}
        />
      )}

      {/* KI-Kaufberater Chat */}
      <AiAdvisor />
    </div>
  )
}
