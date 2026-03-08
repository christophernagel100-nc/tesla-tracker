import { formatPrice } from '@/lib/utils'

interface Props { delta: number; deltaPercent?: number; compact?: boolean }

export default function PriceChangeIndicator({ delta, deltaPercent, compact }: Props) {
  if (delta === 0 || delta === undefined || delta === null) {
    return <span className="text-white/25 text-xs">–</span>
  }

  const isDown = delta < 0
  const color = isDown ? 'text-emerald-400' : 'text-red-400'
  const arrow = isDown ? '↓' : '↑'
  const absPrice = formatPrice(Math.abs(delta))

  if (compact) {
    return (
      <span className={`text-xs font-medium ${color}`}>
        {arrow} {absPrice}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      {arrow} {absPrice}
      {deltaPercent !== undefined && (
        <span className="text-xs opacity-70">({Math.abs(deltaPercent).toFixed(1)}%)</span>
      )}
    </span>
  )
}
