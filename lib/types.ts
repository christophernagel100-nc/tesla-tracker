export type ListingSource = 'tesla.com' | 'mobile.de' | 'kleinanzeigen.de'

export interface TeslaSnapshot {
  id: string
  fetched_at: string
  vin: string
  price: number
  registration_month: number | null
  registration_year: number | null
  odometer_km: number | null
  location: string | null
  has_towbar: boolean | null
  has_damage_history: boolean | null
  listing_url: string | null
  raw_json: Record<string, unknown> | null
  source: ListingSource
  source_listing_id: string | null
}

export interface TeslaVehicle {
  vin: string
  first_seen: string
  last_seen: string
  is_sold: boolean
  sold_at: string | null
  sources: ListingSource[]
}

export interface TeslaPriceChange {
  id: string
  vin: string
  changed_at: string
  price_before: number
  price_after: number
  delta: number
  delta_pct: number
  source: ListingSource
}

export interface TeslaCurrentListing extends TeslaSnapshot {
  first_seen: string
  last_seen: string
  is_sold: boolean
  sold_at: string | null
  days_on_market: number
  sources: ListingSource[]
}

export interface SourceStats {
  source: ListingSource
  count: number
  avgPrice: number
  lowestPrice: number
}

export interface DashboardStats {
  activeListings: number
  avgPrice: number
  lowestPrice: number
  priceDrops24h: number
  bySource: SourceStats[]
}

export interface CrossSourceMatch {
  vin: string
  prices: Partial<Record<ListingSource, number>>
  priceDiff: number
  cheapestSource: ListingSource
}

export const SOURCE_COLORS: Record<ListingSource, string> = {
  'tesla.com': '#ef4444',
  'mobile.de': '#3b82f6',
  'kleinanzeigen.de': '#10b981',
}

export const SOURCE_LABELS: Record<ListingSource, string> = {
  'tesla.com': 'Tesla',
  'mobile.de': 'mobile.de',
  'kleinanzeigen.de': 'Kleinanz.',
}
