interface Props { daysUntil: number }

export default function CountdownBanner({ daysUntil }: Props) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4 border border-[rgba(213,188,162,0.2)] bg-[rgba(213,188,162,0.05)]">
      <div className="text-3xl font-bold gradient-text tabular-nums">{daysUntil}</div>
      <div>
        <div className="text-sm font-medium text-white/80">Tage bis Kaufbereitschaft</div>
        <div className="text-xs text-white/40">25. März 2026 — Quartalsende Tesla DE</div>
      </div>
      <div className="ml-auto text-xs text-white/30 text-right">
        <div>Q1 2026 Preisrückgang</div>
        <div>erwartet</div>
      </div>
    </div>
  )
}
