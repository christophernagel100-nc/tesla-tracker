import { Suspense } from 'react'
import { getCurrentListings, getDashboardStats, getAllVinPriceHistory, getRecentPriceChanges } from '@/lib/queries'
import DashboardContent from './DashboardContent'

export const revalidate = 0

export default async function DashboardPage() {
  const [listings, stats, vinPriceHistory, recentChanges] = await Promise.all([
    getCurrentListings(),
    getDashboardStats(),
    getAllVinPriceHistory(),
    getRecentPriceChanges(),
  ])

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DashboardContent
        listings={listings}
        stats={stats}
        vinPriceHistory={vinPriceHistory}
        recentChanges={recentChanges}
      />
    </Suspense>
  )
}
