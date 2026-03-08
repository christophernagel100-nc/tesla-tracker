import { TeslaCurrentListing } from './types'

export interface ScoreResult {
  score: number
  color: 'green' | 'yellow' | 'red'
  label: string
  reasons: string[]
}

export function calcBuyScore(listing: TeslaCurrentListing, avgPrice: number): ScoreResult {
  const reasons: string[] = []
  let score = 0

  // Repariert: Ausschlusskriterium
  if (listing.has_damage_history) {
    return { score: 0, color: 'red', label: 'Repariert', reasons: ['Unfall in der Vergangenheit'] }
  }

  // Preis vs. Durchschnitt
  if (avgPrice > 0) {
    const priceDiff = (listing.price - avgPrice) / avgPrice
    if (priceDiff <= -0.05) { score += 3; reasons.push('Preis >5% unter Ø') }
    else if (priceDiff < 0) { score += 2; reasons.push('Preis unter Durchschnitt') }
  }

  // Kilometerstand
  const km = listing.odometer_km || 0
  if (km < 20000) { score += 3; reasons.push('Unter 20.000 km') }
  else if (km < 30000) { score += 2; reasons.push('Unter 30.000 km') }

  // Alter
  const year = listing.registration_year
  if (year) {
    const age = new Date().getFullYear() - year
    if (age < 2) { score += 2; reasons.push('Unter 2 Jahre alt') }
    else if (age < 3) { score += 1; reasons.push('Unter 3 Jahre alt') }
  }

  // Anhängerkupplung
  if (listing.has_towbar) { score += 1; reasons.push('Mit Anhängerkupplung') }

  // Lang online (Tesla hat Druck)
  if (listing.days_on_market > 14) { score += 1; reasons.push(`${listing.days_on_market} Tage online`) }

  // Bewertung
  if (score >= 7) return { score, color: 'green', label: 'Kaufempfehlung', reasons }
  if (score >= 4) return { score, color: 'yellow', label: 'Interessant', reasons }
  return { score, color: 'red', label: 'Abwarten', reasons }
}
