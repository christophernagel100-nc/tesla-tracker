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

  // Hardware-Generation: Ultraschallsensoren (bis 09/2022)
  const regYear = listing.registration_year
  const regMonth = listing.registration_month
  const km = listing.odometer_km || 0

  if (regYear !== null) {
    const hasUltrasonic =
      regYear < 2022 || (regYear === 2022 && regMonth !== null && regMonth <= 9)

    if (hasUltrasonic) {
      score += 3
      reasons.push('Ultraschallsensoren (≤ 09/2022)')
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

  // Lang online (Tesla hat Druck)
  if (listing.days_on_market > 14) { score += 1; reasons.push(`${listing.days_on_market} Tage online`) }

  // Quartalsende-Faktor: Tesla senkt Preise zum Quartalsende
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const isQuarterEndMonth = [3, 6, 9, 12].includes(month)
  if (isQuarterEndMonth && day >= 21) {
    score += 1
    reasons.push('Quartalsende — Preisfall wahrscheinlich')
  }

  // Bewertung
  if (score >= 7) return { score, color: 'green', label: 'Kaufempfehlung', reasons }
  if (score >= 4) return { score, color: 'yellow', label: 'Interessant', reasons }
  return { score, color: 'red', label: 'Abwarten', reasons }
}
