import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { buildMarketContext } from '@/lib/ai-context'

export const revalidate = 1800 // 30 Minuten Cache in Production

export async function GET() {
  try {
    const marketContext = await buildMarketContext()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system:
        'Du bist ein präziser Marktanalyst für Tesla Gebrauchtfahrzeuge in Deutschland. ' +
        'Schreibe ein knappes Briefing in 2-3 Sätzen. ' +
        'Fokus auf: aktuellen Markttrend, bestes Angebot heute, Kaufempfehlung. ' +
        'Keine Begrüßung, direkt zum Inhalt. Nutze die bereitgestellten Marktdaten.',
      messages: [
        {
          role: 'user',
          content: `${marketContext}\n\nSchreibe jetzt das heutige KI-Marktbriefing.`,
        },
      ],
    })

    const briefing =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ briefing, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('[Market Briefing Error]:', error)
    return NextResponse.json({ error: 'Briefing nicht verfügbar' }, { status: 500 })
  }
}
