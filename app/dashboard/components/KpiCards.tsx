import { formatPrice } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'

interface Props { stats: DashboardStats }

export default function KpiCards({ stats }: Props) {
  const kpis = [
    { label: 'Aktive Listings', value: String(stats.activeListings), sub: 'Model Y Performance' },
    { label: 'Ø Preis', value: formatPrice(stats.avgPrice), sub: 'Aktueller Durchschnitt' },
    { label: 'Günstigstes', value: formatPrice(stats.lowestPrice), sub: 'Bestes Angebot' },
    { label: 'Preisrückgänge', value: String(stats.priceDrops24h), sub: 'Letzte 24 Stunden' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="card p-5">
          <div className="text-xs text-white/40 mb-2 uppercase tracking-wide">{kpi.label}</div>
          <div className="text-2xl font-semibold text-white/95 tracking-tight">{kpi.value}</div>
          <div className="text-xs text-white/30 mt-1">{kpi.sub}</div>
        </div>
      ))}
    </div>
  )
}
