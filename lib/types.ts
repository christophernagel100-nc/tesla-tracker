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
}

export interface TeslaVehicle {
  vin: string
  first_seen: string
  last_seen: string
  is_sold: boolean
  sold_at: string | null
}

export interface TeslaPriceChange {
  id: string
  vin: string
  changed_at: string
  price_before: number
  price_after: number
  delta: number
  delta_pct: number
}

export interface TeslaCurrentListing extends TeslaSnapshot {
  first_seen: string
  last_seen: string
  is_sold: boolean
  days_on_market: number
}

export interface DashboardStats {
  activeListings: number
  avgPrice: number
  lowestPrice: number
  priceDrops24h: number
}
