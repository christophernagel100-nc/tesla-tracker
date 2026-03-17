import { createClient } from './supabase/server'
import type { TeslaCurrentListing, TeslaPriceChange, DashboardStats, ListingSource, SourceStats, CrossSourceMatch } from './types'

export async function getCurrentListings(source?: ListingSource): Promise<TeslaCurrentListing[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tesla_current_listings')
    .select('*')
    .order('price', { ascending: true })

  if (source) {
    query = query.eq('source', source)
  }

  const { data, error } = await query
  if (error) { console.error('getCurrentListings error:', error); return [] }
  return (data || []) as TeslaCurrentListing[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const [listingsRes, priceChangesRes] = await Promise.all([
    supabase.from('tesla_current_listings').select('price, source').eq('is_sold', false),
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

  // Stats per source
  const sourceMap = new Map<string, number[]>()
  for (const l of listings) {
    const src = (l.source as string) || 'tesla.com'
    if (!sourceMap.has(src)) sourceMap.set(src, [])
    sourceMap.get(src)!.push(l.price as number)
  }

  const bySource: SourceStats[] = Array.from(sourceMap.entries()).map(([source, srcPrices]) => ({
    source: source as ListingSource,
    count: srcPrices.length,
    avgPrice: Math.round(srcPrices.reduce((a, b) => a + b, 0) / srcPrices.length),
    lowestPrice: Math.min(...srcPrices),
  }))

  return {
    activeListings: listings.length,
    avgPrice,
    lowestPrice,
    priceDrops24h: (priceChangesRes.data || []).length,
    bySource,
  }
}

export interface PriceChangeWithLocation extends TeslaPriceChange {
  location: string | null
}

export async function getRecentPriceChanges(): Promise<PriceChangeWithLocation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_price_changes')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(20)
  if (error) return []

  const changes = (data || []) as TeslaPriceChange[]
  if (changes.length === 0) return []

  // Location aus Snapshots holen
  const vins = [...new Set(changes.map(c => c.vin))]
  const { data: snapData } = await supabase
    .from('tesla_snapshots')
    .select('vin, location')
    .in('vin', vins)
    .order('fetched_at', { ascending: false })

  const locationMap = new Map<string, string>()
  for (const s of (snapData || [])) {
    if (!locationMap.has(s.vin as string)) {
      locationMap.set(s.vin as string, (s.location as string) || '–')
    }
  }

  return changes.map(c => ({
    ...c,
    location: locationMap.get(c.vin) || null,
  }))
}

const VIN_COLORS = [
  '#d5bca2', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f97316', '#ef4444', '#84cc16', '#ec4899',
]

export interface VinMeta {
  vin: string
  suffix: string
  location: string
  color: string
  source: ListingSource
}

export async function getAllVinPriceHistory(): Promise<{
  chartData: Record<string, number | string>[]
  vinMeta: VinMeta[]
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_snapshots')
    .select('vin, fetched_at, price, location, source')
    .order('fetched_at', { ascending: true })
    .gte('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  if (error || !data || data.length === 0) return { chartData: [], vinMeta: [] }

  // Collect unique VINs with their location and source
  const vinInfoMap = new Map<string, { location: string; source: ListingSource }>()
  for (const row of data) {
    if (!vinInfoMap.has(row.vin as string)) {
      vinInfoMap.set(row.vin as string, {
        location: (row.location as string) || '–',
        source: (row.source as ListingSource) || 'tesla.com',
      })
    }
  }

  const vins = Array.from(vinInfoMap.keys())
  const vinMeta: VinMeta[] = vins.map((vin, i) => ({
    vin,
    suffix: `…${vin.slice(-4)}`,
    location: vinInfoMap.get(vin)!.location,
    color: VIN_COLORS[i % VIN_COLORS.length],
    source: vinInfoMap.get(vin)!.source,
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
    .select('fetched_at, price, source')
    .eq('vin', vin)
    .order('fetched_at', { ascending: true })
  if (error || !data) return []
  return data as { fetched_at: string; price: number; source: ListingSource }[]
}

export async function getCrossSourceMatches(): Promise<CrossSourceMatch[]> {
  const supabase = await createClient()

  // Get all current listings grouped by VIN
  const { data, error } = await supabase
    .from('tesla_current_listings')
    .select('vin, price, source')
    .eq('is_sold', false)
    .order('vin')

  if (error || !data) return []

  // Group by VIN — only real VINs (not NVIN-)
  const vinMap = new Map<string, Map<string, number>>()
  for (const row of data) {
    const vin = row.vin as string
    if (vin.startsWith('NVIN-')) continue
    if (!vinMap.has(vin)) vinMap.set(vin, new Map())
    vinMap.get(vin)!.set(row.source as string, row.price as number)
  }

  // Filter VINs on multiple sources
  const matches: CrossSourceMatch[] = []
  for (const [vin, sourcePrices] of vinMap) {
    if (sourcePrices.size < 2) continue

    const prices: Partial<Record<ListingSource, number>> = {}
    let minPrice = Infinity
    let cheapestSource: ListingSource = 'tesla.com'

    for (const [source, price] of sourcePrices) {
      prices[source as ListingSource] = price
      if (price < minPrice) {
        minPrice = price
        cheapestSource = source as ListingSource
      }
    }

    const priceValues = Array.from(sourcePrices.values())
    const priceDiff = Math.max(...priceValues) - Math.min(...priceValues)

    matches.push({ vin, prices, priceDiff, cheapestSource })
  }

  return matches.sort((a, b) => b.priceDiff - a.priceDiff)
}
