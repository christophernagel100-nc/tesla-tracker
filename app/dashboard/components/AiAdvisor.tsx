'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Welches Auto soll ich jetzt kaufen?',
  'Wann ist der beste Zeitpunkt zum Kaufen?',
  'Hat sich der Markt diese Woche verändert?',
]

export default function AiAdvisor() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300',
          'bg-indigo-500 hover:bg-indigo-600 text-white',
          open && 'rotate-45'
        )}
        aria-label="KI-Berater öffnen"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex flex-col card-glass rounded-2xl shadow-2xl animate-slide-up"
          style={{ width: 'min(380px, calc(100vw - 3rem))', maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <div>
              <div className="text-sm font-medium text-foreground">KI-Kaufberater</div>
              <div className="text-xs text-subtle-foreground">claude-sonnet-4-6 · Echtzeit-Marktdaten</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-subtle-foreground mb-3">Frag mich zum Tesla-Markt:</p>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left text-xs text-muted-foreground bg-subtle hover:bg-muted border border-border rounded-xl px-3 py-2 transition-colors"
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
            <div ref={bottomRef} />
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
                placeholder="Deine Frage..."
                disabled={streaming}
                className="flex-1 bg-input border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground outline-none focus:border-indigo-500/40 transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={streaming || !input.trim()}
                className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
