import { getCurrentListings, getDashboardStats, getRecentPriceChanges } from './queries'
import { calcBuyScore } from './scoring'
import { formatPrice, formatKm, formatRegistration } from './utils'

export async function buildMarketContext(): Promise<string> {
  const [listings, stats, recentChanges] = await Promise.all([
    getCurrentListings(),
    getDashboardStats(),
    getRecentPriceChanges(),
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
