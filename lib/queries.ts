import { createClient } from './supabase/server'
import type { TeslaCurrentListing, TeslaPriceChange, DashboardStats } from './types'

export async function getCurrentListings(): Promise<TeslaCurrentListing[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_current_listings')
    .select('*')
    .order('price', { ascending: true })
  if (error) { console.error('getCurrentListings error:', error); return [] }
  return (data || []) as TeslaCurrentListing[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const [listingsRes, priceChangesRes] = await Promise.all([
    supabase.from('tesla_current_listings').select('price'),
    supabase
      .from('tesla_price_changes')
      .select('delta')
      .lt('delta', 0)
      .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const listings = listingsRes.data || []
  const prices = listings.map((l) => l.price as number).filter(Boolean)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const lowestPrice = prices.length ? Math.min(...prices) : 0

  return {
    activeListings: listings.length,
    avgPrice,
    lowestPrice,
    priceDrops24h: (priceChangesRes.data || []).length,
  }
}

export async function getRecentPriceChanges(): Promise<TeslaPriceChange[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_price_changes')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data || []) as TeslaPriceChange[]
}

const VIN_COLORS = [
  '#d5bca2', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f97316', '#ef4444', '#84cc16', '#ec4899',
]

export interface VinMeta { suffix: string; location: string; color: string }

export async function getAllVinPriceHistory(): Promise<{
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_snapshots')
    .select('vin, fetched_at, price, location')
    .order('fetched_at', { ascending: true })
    .gte('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  if (error || !data || data.length === 0) return { chartData: [], vinMeta: [] }

  // Collect unique VINs with their location
  const vinLocationMap = new Map<string, string>()
  for (const row of data) {
    if (!vinLocationMap.has(row.vin as string)) {
      vinLocationMap.set(row.vin as string, (row.location as string) || '–')
    }
  }

  const vins = Array.from(vinLocationMap.keys())
  const vinMeta: VinMeta[] = vins.map((vin, i) => ({
    suffix: `…${vin.slice(-4)}`,
    location: vinLocationMap.get(vin)!,
    color: VIN_COLORS[i % VIN_COLORS.length],
  }))

  // Group by day + vin: take last price of the day per VIN
  const dayVinMap = new Map<string, Map<string, number>>()
  for (const row of data) {
    const day = (row.fetched_at as string).substring(0, 10)
    if (!dayVinMap.has(day)) dayVinMap.set(day, new Map())
    dayVinMap.get(day)!.set(row.vin as string, row.price as number)
  }

  // Build chart data: [{date:"08.03", "…4305":31000, "…0581":36300, ...}]
  const { format } = await import('date-fns')
  const chartData = Array.from(dayVinMap.entries()).map(([day, vinPrices]) => {
    const point: Record<string, number | string> = {
      date: format(new Date(day), 'dd.MM'),
    }
    for (const meta of vinMeta) {
      const vin = vins[vinMeta.indexOf(meta)]
      if (vinPrices.has(vin)) point[meta.suffix] = vinPrices.get(vin)!
    }
    return point
  })

  return { chartData, vinMeta }
}

export async function getVinHistory(vin: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_snapshots')
    .select('fetched_at, price')
    .eq('vin', vin)
    .order('fetched_at', { ascending: true })
  if (error || !data) return []
  return data as { fetched_at: string; price: number }[]
}
