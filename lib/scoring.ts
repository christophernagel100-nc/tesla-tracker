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

  // Hardware-Generation: Ultraschallsensoren (bis 09/2022) oder Garantiefahrzeug (2024+, <40k km)
  const regYear = listing.registration_year
  const regMonth = listing.registration_month
  const km = listing.odometer_km || 0

  if (regYear !== null) {
    const hasUltrasonic =
      regYear < 2022 || (regYear === 2022 && regMonth !== null && regMonth <= 9)
    const hasWarranty = regYear >= 2024 && km < 40000

    if (hasUltrasonic) {
      score += 3
      reasons.push('Ultraschallsensoren (≤ 09/2022)')
    } else if (hasWarranty) {
      score += 3
      reasons.push('Garantiefahrzeug (2024+)')
    }
  }

  // Preis vs. Durchschnitt
  if (avgPrice > 0) {
    const priceDiff = (listing.price - avgPrice) / avgPrice
    if (priceDiff <= -0.05) { score += 3; reasons.push('Preis >5% unter Ø') }
    else if (priceDiff < 0) { score += 2; reasons.push('Preis unter Durchschnitt') }
  }

  // Kilometerstand
  if (km < 20000) { score += 3; reasons.push('Unter 20.000 km') }
  else if (km < 40000) { score += 2; reasons.push('Unter 40.000 km') }
  else if (km < 70000) { score += 1; reasons.push('Unter 70.000 km') }

  // Anhängerkupplung
  if (listing.has_towbar) { score += 1; reasons.push('Mit Anhängerkupplung') }

  // Lang online (Tesla hat Druck)
  if (listing.days_on_market > 14) { score += 1; reasons.push(`${listing.days_on_market} Tage online`) }

  // Bewertung
  if (score >= 7) return { score, color: 'green', label: 'Kaufempfehlung', reasons }
  if (score >= 4) return { score, color: 'yellow', label: 'Interessant', reasons }
  return { score, color: 'red', label: 'Abwarten', reasons }
}
