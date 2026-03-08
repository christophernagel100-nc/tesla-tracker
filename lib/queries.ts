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

export async function getPriceHistory(): Promise<{ date: string; avg: number; min: number }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tesla_snapshots')
    .select('fetched_at, price')
    .order('fetched_at', { ascending: true })
    .gte('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  if (error || !data) return []

  const byDay = new Map<string, number[]>()
  for (const row of data) {
    const day = row.fetched_at.substring(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(row.price as number)
  }

  return Array.from(byDay.entries()).map(([date, prices]) => ({
    date,
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    min: Math.min(...prices),
  }))
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
