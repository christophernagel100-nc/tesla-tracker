import { cn } from '@/lib/utils'
import type { ScoreResult } from '@/lib/scoring'

interface Props { result: ScoreResult; compact?: boolean }

export default function BuyScore({ result, compact }: Props) {
  const colorMap = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  if (compact) {
    const dotMap = { green: 'bg-emerald-400', yellow: 'bg-amber-400', red: 'bg-red-400' }
    return (
      <span className="flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full', dotMap[result.color])} />
        <span className="text-xs text-white/60">{result.score}/10</span>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border', colorMap[result.color])}>
      <span className="tabular-nums">{result.score}</span>
      <span className="text-current/70">{result.label}</span>
    </span>
  )
}
