'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getQuarterInfo, formatGermanDate, type QuarterInfo } from '@/lib/quarter-utils'
import { MessageSquare, ChevronDown, ChevronUp, Send, Clock, Truck, TrendingDown, Zap } from 'lucide-react'

// ─── Chat Types ───
interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Wann genau sollte ich bestellen für Q1-Lieferung?',
  'Wie läuft die Tesla-Übergabe ab?',
  'Welches Auto hat den besten Score gerade?',
]

// ─── Phase Badge Colors ───
const PHASE_STYLES: Record<QuarterInfo['phaseColor'], string> = {
  emerald: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  amber: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  muted: 'bg-muted text-muted-foreground border-border',
}

const RECOMMENDATION_BORDERS: Record<QuarterInfo['phaseColor'], string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  indigo: 'border-indigo-500/30 bg-indigo-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  muted: 'border-border bg-subtle',
}

const PHASE_ICONS: Record<QuarterInfo['phaseColor'], typeof Clock> = {
  emerald: Zap,
  indigo: TrendingDown,
  amber: Clock,
  red: Clock,
  muted: Clock,
}

export default function QuarterEndAdvisor() {
  const info = useMemo(() => getQuarterInfo(), [])

  // ─── Chat State ───
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming) return

    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.body) throw new Error('No stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Entschuldigung, es ist ein Fehler aufgetreten.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  // ─── Timeline Calculations ───
  const priceDropStartPercent = Math.max(0, ((info.daysInQuarter - 10) / info.daysInQuarter) * 100)
  const latestOrderPercent = Math.max(0, Math.min(100,
    ((info.daysInQuarter - info.daysRemaining + info.daysUntilLatestOrder === 0 ? 0 : info.daysUntilLatestOrder) / info.daysInQuarter) * 100
  ))
  // Compute latest order position from start
  const latestOrderDayFromStart = info.daysInQuarter - (info.daysRemaining - info.daysUntilLatestOrder)
  const latestOrderPos = Math.max(0, Math.min(100, (latestOrderDayFromStart / info.daysInQuarter) * 100))

  const PhaseIcon = PHASE_ICONS[info.phaseColor]

  return (
    <div className="card p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Tesla Kaufberater
        </span>
        <div className={cn('ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border', PHASE_STYLES[info.phaseColor])}>
          {info.phaseLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ═══ LEFT: Timeline + Info Cards (3/5) ═══ */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quarter Timeline */}
          <div className="bg-subtle border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-foreground/80">{info.quarterLabel} Timeline</span>
              <span className="text-xs text-muted-foreground">
                {formatGermanDate(info.quarterStartDate)} — {formatGermanDate(info.quarterEndDate)}
              </span>
            </div>

            {/* Timeline Bar */}
            <div className="relative h-3 my-1">
              {/* Track */}
              <div className="absolute inset-0 bg-muted rounded-full overflow-hidden">
                {/* Progress fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500/40 to-indigo-500/60 transition-all duration-500"
                  style={{ width: `${info.percentComplete}%` }}
                />
                {/* Price drop zone */}
                <div
                  className="absolute inset-y-0 bg-emerald-500/20 border-l border-emerald-500/40"
                  style={{ left: `${priceDropStartPercent}%`, right: '0%' }}
                />
              </div>
              {/* Latest order marker (outside overflow-hidden) */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                style={{ left: `${latestOrderPos}%` }}
              />
              {/* Today indicator (outside overflow-hidden so it's not clipped) */}
              <div
                className="absolute top-1/2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-background shadow-[0_0_0_3px_rgba(99,102,241,0.3)] transition-all duration-500"
                style={{ left: `${info.percentComplete}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>

            {/* Timeline Labels */}
            <div className="relative mt-3 h-5 text-[10px] font-medium">
              <span className="absolute left-0 text-muted-foreground">Jan</span>
              <span
                className="absolute text-emerald-400 -translate-x-1/2"
                style={{ left: `${priceDropStartPercent}%` }}
              >
                Preisfenster
              </span>
              <span
                className="absolute text-amber-400 -translate-x-1/2"
                style={{ left: `${latestOrderPos}%` }}
              >
                Letzter Bestelltag
              </span>
              <span className="absolute right-0 text-muted-foreground">
                {formatGermanDate(info.quarterEndDate)}
              </span>
            </div>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Countdown */}
            <div className="bg-subtle border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wide">
                  Quartals-Countdown
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">{info.daysRemaining}</span>
                <span className="text-xs text-muted-foreground">Tage verbleibend</span>
              </div>
              {info.daysUntilLatestOrder > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Noch <span className="text-foreground font-medium">{info.daysUntilLatestOrder} Tage</span> bis zum letzten Bestelltag
                </p>
              )}
            </div>

            {/* Delivery Window */}
            <div className="bg-subtle border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Truck className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wide">
                  Lieferfenster
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Tesla benötigt <span className="font-medium text-foreground">5-7 Werktage</span> für die Übergabe.
                Fahrzeug muss <span className="font-medium text-foreground">im selben Quartal</span> übergeben werden.
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Spätester Bestelltag: <span className="text-foreground font-medium">~{formatGermanDate(info.latestOrderDate)}</span>
              </p>
            </div>

            {/* Price Pattern */}
            <div className="bg-subtle border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-subtle-foreground uppercase tracking-wide">
                  Preismuster
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Tesla senkt Preise in den <span className="font-medium text-foreground">letzten 10 Tagen</span> jedes Quartals für die Wall-Street-Zahlen.
              </p>
              <p className="text-xs mt-1.5">
                {info.isInPriceDropWindow ? (
                  <span className="text-emerald-500 font-medium">Aktuell im Preisfenster — Preise sind reduziert</span>
                ) : (
                  <span className="text-muted-foreground">
                    Preisfenster startet am {formatGermanDate(info.priceDropWindowStart)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Dynamic Recommendation */}
          <div className={cn('rounded-xl border p-4 flex items-start gap-3', RECOMMENDATION_BORDERS[info.phaseColor])}>
            <PhaseIcon className={cn('w-5 h-5 mt-0.5 shrink-0', {
              'text-emerald-500': info.phaseColor === 'emerald',
              'text-indigo-400': info.phaseColor === 'indigo',
              'text-amber-500': info.phaseColor === 'amber',
              'text-red-400': info.phaseColor === 'red',
              'text-muted-foreground': info.phaseColor === 'muted',
            })} />
            <div>
              <div className="text-sm font-medium text-foreground mb-0.5">Empfehlung</div>
              <p className="text-sm text-foreground/75 leading-relaxed">{info.recommendation}</p>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Embedded Chat (2/5) ═══ */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Mobile toggle */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className="lg:hidden flex items-center justify-between w-full bg-subtle border border-border rounded-xl px-4 py-3 mb-3"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-foreground">KI-Kaufberater Chat</span>
            </div>
            {chatOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          <div className={cn(
            'flex flex-col bg-subtle border border-border rounded-xl overflow-hidden transition-all',
            chatOpen ? 'flex-1' : 'hidden lg:flex lg:flex-1',
          )}>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <div>
                <div className="text-sm font-medium text-foreground">KI-Kaufberater</div>
                <div className="text-[10px] text-subtle-foreground">claude-sonnet-4-6 · Echtzeit-Marktdaten</div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[340px]">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-subtle-foreground mb-3">Frag mich zum Tesla-Kauf:</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs text-muted-foreground bg-background/50 hover:bg-muted border border-border rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'text-foreground bg-muted rounded-xl px-3 py-2 ml-6'
                      : 'text-foreground/75'
                  )}
                >
                  {m.content}
                  {m.role === 'assistant' && streaming && i === messages.length - 1 && (
                    <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Deine Frage zum Tesla-Kauf..."
                  disabled={streaming}
                  className="flex-1 bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground outline-none focus:border-indigo-500/40 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={streaming || !input.trim()}
                  className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
