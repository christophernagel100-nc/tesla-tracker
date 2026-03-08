import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { buildMarketContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'

export interface MarketBriefingData {
  marktlage: string        // 1 kurzer Satz: Trend + Anzahl + Ø-Preis
  topAngebot: {
    vin: string            // letzte 6 Zeichen
    preis: string          // z.B. "38.600 €"
    grund: string          // 1 Satz warum
  }
  empfehlung: string       // Kauf jetzt / Abwarten / etc. — 1 Satz
  warnung: string | null   // VIN die gemieden werden soll, oder null
}

export async function GET() {
  try {
    const marketContext = await buildMarketContext()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system:
        'Du bist ein präziser Marktanalyst für Tesla Gebrauchtfahrzeuge in Deutschland. ' +
        'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, kein Text davor oder danach. ' +
        'Format: { "marktlage": string, "topAngebot": { "vin": string, "preis": string, "grund": string }, "empfehlung": string, "warnung": string | null } ' +
        'Regeln: Keine Markdown-Formatierung. Keine Sternchen. Kurze, direkte Sätze. VIN immer als "…XXXXXX" (letzte 6 Zeichen).',
      messages: [
        {
          role: 'user',
          content: `${marketContext}\n\nGib das strukturierte JSON-Briefing aus.`,
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // JSON aus der Antwort extrahieren
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Kein JSON in Antwort')
    const data: MarketBriefingData = JSON.parse(jsonMatch[0])

    return NextResponse.json({ data, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('[Market Briefing Error]:', error)
    return NextResponse.json({ error: 'Briefing nicht verfügbar' }, { status: 500 })
  }
}
