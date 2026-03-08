import { Suspense } from 'react'
import { getCurrentListings, getDashboardStats, getPriceHistory, getRecentPriceChanges } from '@/lib/queries'
import DashboardContent from './DashboardContent'

export const revalidate = 0

export default async function DashboardPage() {
  const [listings, stats, priceHistory, recentChanges] = await Promise.all([
    getCurrentListings(),
    getDashboardStats(),
    getPriceHistory(),
    getRecentPriceChanges(),
  ])

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DashboardContent
        listings={listings}
        stats={stats}
        priceHistory={priceHistory}
        recentChanges={recentChanges}
      />
    </Suspense>
  )
}
