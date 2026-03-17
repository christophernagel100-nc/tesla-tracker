export type QuarterPhase = 'early' | 'approaching' | 'hot' | 'critical' | 'too-late'

export interface QuarterInfo {
  quarterNumber: 1 | 2 | 3 | 4
  quarterLabel: string          // e.g. "Q1 2026"
  quarterStartDate: Date
  quarterEndDate: Date
  daysInQuarter: number
  daysPassed: number
  daysRemaining: number
  percentComplete: number
  isQuarterEndMonth: boolean
  priceDropWindowStart: Date    // 10 days before quarter end
  isInPriceDropWindow: boolean
  latestOrderDate: Date         // ~7 calendar days before quarter end (5 business days)
  daysUntilLatestOrder: number
  isPastDeliveryDeadline: boolean
  phase: QuarterPhase
  phaseLabel: string
  phaseColor: 'emerald' | 'indigo' | 'amber' | 'red' | 'muted'
  recommendation: string
  nextQuarterWindow: string     // e.g. "Q2 2026 (Juni)"
}

function getQuarterDates(date: Date): { start: Date; end: Date; quarter: 1 | 2 | 3 | 4 } {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-based

  if (month <= 2) return { start: new Date(year, 0, 1), end: new Date(year, 2, 31), quarter: 1 }
  if (month <= 5) return { start: new Date(year, 3, 1), end: new Date(year, 5, 30), quarter: 2 }
  if (month <= 8) return { start: new Date(year, 6, 1), end: new Date(year, 8, 30), quarter: 3 }
  return { start: new Date(year, 9, 1), end: new Date(year, 11, 31), quarter: 4 }
}

function subtractBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() - 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }
  return result
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((b.getTime() - a.getTime()) / msPerDay)
}

const QUARTER_MONTHS: Record<number, string> = {
  1: 'März', 2: 'Juni', 3: 'September', 4: 'Dezember',
}

export function getQuarterInfo(now: Date = new Date()): QuarterInfo {
  const { start, end, quarter } = getQuarterDates(now)

  const daysInQuarter = daysBetween(start, end) + 1
  const daysPassed = daysBetween(start, now)
  const daysRemaining = daysBetween(now, end)
  const percentComplete = Math.min(100, Math.max(0, (daysPassed / daysInQuarter) * 100))

  const month = now.getMonth() + 1
  const isQuarterEndMonth = [3, 6, 9, 12].includes(month)

  // Price drop window: last 10 days of quarter
  const priceDropWindowStart = new Date(end)
  priceDropWindowStart.setDate(priceDropWindowStart.getDate() - 9)
  const isInPriceDropWindow = now >= priceDropWindowStart && now <= end

  // Latest order date: 5 business days before quarter end (~7 calendar days)
  const latestOrderDate = subtractBusinessDays(end, 5)
  const daysUntilLatestOrder = daysBetween(now, latestOrderDate)
  const isPastDeliveryDeadline = now > latestOrderDate

  // Determine phase
  let phase: QuarterPhase
  let phaseLabel: string
  let phaseColor: QuarterInfo['phaseColor']
  let recommendation: string

  // Next quarter info
  const nextQ = (quarter % 4) + 1 as 1 | 2 | 3 | 4
  const nextYear = quarter === 4 ? now.getFullYear() + 1 : now.getFullYear()
  const nextQuarterWindow = `Q${nextQ} ${nextYear} (${QUARTER_MONTHS[nextQ]})`

  if (isPastDeliveryDeadline && daysRemaining <= 0) {
    // Quarter is over
    phase = 'too-late'
    phaseLabel = 'Quartal vorbei'
    phaseColor = 'muted'
    recommendation = `Dieses Quartal ist vorbei. Nächstes Preisfenster: ${nextQuarterWindow}.`
  } else if (isPastDeliveryDeadline) {
    phase = 'too-late'
    phaseLabel = 'Lieferung nicht mehr möglich'
    phaseColor = 'red'
    recommendation = `Q${quarter}-Lieferung nicht mehr realistisch. Entweder jetzt zum Tiefstpreis kaufen (Lieferung in Q${nextQ}) oder auf ${nextQuarterWindow} warten.`
  } else if (daysRemaining <= 5) {
    phase = 'critical'
    phaseLabel = 'Letzte Chance'
    phaseColor = 'amber'
    recommendation = `Nur noch ${daysUntilLatestOrder} Tage bis zum letzten Bestelltag für Q${quarter}-Lieferung. Jetzt handeln oder auf ${nextQuarterWindow} warten.`
  } else if (daysRemaining <= 10) {
    phase = 'hot'
    phaseLabel = 'Bestes Zeitfenster'
    phaseColor = 'emerald'
    recommendation = `JETZT ist der beste Zeitpunkt! Tesla senkt aktiv die Preise. Noch ${daysUntilLatestOrder} Tage bis zum letzten Bestelltag für Q${quarter}-Lieferung.`
  } else if (daysRemaining <= 15) {
    phase = 'approaching'
    phaseLabel = 'Preisfenster nähert sich'
    phaseColor = 'indigo'
    recommendation = `Noch ${daysRemaining} Tage bis Quartalsende. Preissenkungen beginnen typischerweise in ${daysRemaining - 10} Tagen. Markt genau beobachten.`
  } else {
    phase = 'early'
    phaseLabel = 'Markt beobachten'
    phaseColor = 'muted'
    recommendation = `Noch ${daysRemaining} Tage bis Quartalsende. Preissenkungen werden in den letzten 10 Tagen erwartet. Aktuell: Markt beobachten und Favoriten merken.`
  }

  return {
    quarterNumber: quarter,
    quarterLabel: `Q${quarter} ${now.getFullYear()}`,
    quarterStartDate: start,
    quarterEndDate: end,
    daysInQuarter,
    daysPassed,
    daysRemaining,
    percentComplete,
    isQuarterEndMonth,
    priceDropWindowStart,
    isInPriceDropWindow,
    latestOrderDate,
    daysUntilLatestOrder,
    isPastDeliveryDeadline,
    phase,
    phaseLabel,
    phaseColor,
    recommendation,
    nextQuarterWindow,
  }
}

/** Format date as "25. März" style */
export function formatGermanDate(date: Date): string {
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}
