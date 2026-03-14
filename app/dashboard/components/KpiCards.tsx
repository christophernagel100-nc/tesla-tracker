import { formatPrice } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'
import { SOURCE_COLORS, SOURCE_LABELS } from '@/lib/types'

interface Props { stats: DashboardStats }

export default function KpiCards({ stats }: Props) {
  const kpis = [
    { label: 'Aktive Listings', value: String(stats.activeListings), sub: 'Model Y Performance' },
    { label: 'Ø Preis', value: formatPrice(stats.avgPrice), sub: 'Aktueller Durchschnitt' },
    { label: 'Günstigstes', value: formatPrice(stats.lowestPrice), sub: 'Bestes Angebot' },
    { label: 'Preisrückgänge', value: String(stats.priceDrops24h), sub: 'Letzte 24 Stunden' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{kpi.label}</div>
            <div className="text-2xl font-semibold text-foreground tracking-tight">{kpi.value}</div>
            <div className="text-xs text-subtle-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Source Breakdown */}
      {stats.bySource.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stats.bySource.map((s) => (
            <div
              key={s.source}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: `${SOURCE_COLORS[s.source]}10`,
                border: `1px solid ${SOURCE_COLORS[s.source]}20`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: SOURCE_COLORS[s.source] }}
              />
              <span className="text-muted-foreground font-medium">{SOURCE_LABELS[s.source]}</span>
              <span className="text-foreground tabular-nums">{s.count}</span>
              <span className="text-subtle-foreground">·</span>
              <span className="text-subtle-foreground tabular-nums">Ø {formatPrice(s.avgPrice)}</span>
              <span className="text-subtle-foreground">·</span>
              <span className="text-subtle-foreground tabular-nums">ab {formatPrice(s.lowestPrice)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
