import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { calcBuyScore } from './scoring'
import { formatPrice, formatKm, formatRegistration } from './utils'
import type { TeslaCurrentListing, TeslaPriceChange, DashboardStats } from './types'

// Direkter Supabase-Client ohne Cookie-Abhängigkeit (für API Routes)
function getClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getListings(): Promise<TeslaCurrentListing[]> {
  const { data, error } = await getClient()
    .from('tesla_current_listings')
    .select('*')
    .order('price', { ascending: true })
  if (error) return []
  return (data || []) as TeslaCurrentListing[]
}

async function getStats(): Promise<DashboardStats> {
  const supabase = getClient()
  const [listingsRes, dropsRes] = await Promise.all([
    supabase.from('tesla_current_listings').select('price').eq('is_sold', false),
    supabase
      .from('tesla_price_changes')
      .select('delta')
      .lt('delta', 0)
      .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])
  const prices = (listingsRes.data || []).map(l => l.price as number).filter(Boolean)
  return {
    activeListings: prices.length,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    lowestPrice: prices.length ? Math.min(...prices) : 0,
    priceDrops24h: (dropsRes.data || []).length,
    bySource: [],
  }
}

async function getRecentDrops(): Promise<TeslaPriceChange[]> {
  const { data } = await getClient()
    .from('tesla_price_changes')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(20)
  return (data || []) as TeslaPriceChange[]
}

export async function buildMarketContext(): Promise<string> {
  const [listings, stats, recentChanges] = await Promise.all([
    getListings(),
    getStats(),
    getRecentDrops(),
  ])

  const KAUFZIEL = new Date('2026-03-25')
  const daysUntil = Math.ceil((KAUFZIEL.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const scoredListings = listings.map(l => ({
    ...l,
    score: calcBuyScore(l, stats.avgPrice),
  }))

  const topPicks = [...scoredListings]
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 3)

  const recentDrops = recentChanges.filter(c => c.delta < 0).slice(0, 5)

  const lines: string[] = [
    `## Marktdaten — Tesla Model Y Performance DE Gebrauchtmarkt`,
    `Stand: ${new Date().toLocaleString('de-DE')}`,
    `Tage bis Kaufziel (25.03.2026): ${daysUntil}`,
    ``,
    `### Marktübersicht`,
    `- Aktive Listings: ${stats.activeListings}`,
    `- Durchschnittspreis: ${formatPrice(stats.avgPrice)}`,
    `- Günstigstes Angebot: ${formatPrice(stats.lowestPrice)}`,
    `- Preisrückgänge letzte 24h: ${stats.priceDrops24h}`,
    ``,
    `### Alle aktuellen Angebote (nach Score sortiert)`,
  ]

  for (const l of scoredListings.sort((a, b) => b.score.score - a.score.score)) {
    lines.push(
      `- VIN …${l.vin.slice(-6)} | Score: ${l.score.score}/10 (${l.score.label}) | ` +
      `${formatPrice(l.price)} | ${formatKm(l.odometer_km)} | ` +
      `EZ: ${formatRegistration(l.registration_month, l.registration_year)} | ` +
      `Standort: ${l.location || '–'} | AHK: ${l.has_towbar ? 'Ja' : 'Nein'} | ` +
      `Repariert: ${l.has_damage_history ? 'JA ⚠' : 'Nein'} | ` +
      `${l.days_on_market}d online | Gründe: ${l.score.reasons.join(', ')}`
    )
  }

  lines.push(``, `### Top 3 Kaufempfehlungen`)
  for (const l of topPicks) {
    lines.push(`- VIN …${l.vin.slice(-6)}: Score ${l.score.score}/10 — ${formatPrice(l.price)}`)
  }

  if (recentDrops.length > 0) {
    lines.push(``, `### Letzte Preissenkungen`)
    for (const c of recentDrops) {
      lines.push(
        `- VIN …${c.vin.slice(-6)}: ${formatPrice(c.price_before)} → ${formatPrice(c.price_after)} ` +
        `(${Number(c.delta_pct).toFixed(1)}%)`
      )
    }
  }

  return lines.join('\n')
}
