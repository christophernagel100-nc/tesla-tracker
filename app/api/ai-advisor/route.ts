import Anthropic from '@anthropic-ai/sdk'
import { buildMarketContext } from '@/lib/ai-context'

// KEIN runtime = 'edge' — Anthropic SDK braucht Node.js

const SYSTEM_PROMPT = `Du bist ein persönlicher Tesla-Kaufberater für einen Kunden in Deutschland, der einen Tesla Model Y Performance kaufen möchte. Das Kaufziel ist der 25. März 2026 (Q1-Ende — historisch senkt Tesla DE die Preise zum Quartalsschluss).

SCORE-SYSTEM (0-10 Punkte):
• +3 Ultraschallsensoren: Erstzulassung ≤ September 2022
• +3 Garantiefahrzeug: EZ 2024+ UND unter 40.000 km
• +3 Preis >5% unter Marktdurchschnitt | +2 Preis unter Durchschnitt
• +3 unter 20.000 km | +2 unter 40.000 km | +1 unter 70.000 km
• +1 Anhängerkupplung vorhanden
• +1 mehr als 14 Tage online (Tesla hat Verkaufsdruck)
• Score ≥7 = Kaufempfehlung (grün) | ≥4 = Interessant (gelb) | <4 = Abwarten (rot)

DEINE REGELN:
- Antworte immer auf Deutsch, direkt und ohne Floskeln
- Bei Empfehlungen: nenne immer VIN-Suffix (letzte 6 Zeichen), Preis und den Hauptgrund
- Sei ehrlich — wenn der Markt nichts Gutes bietet, sag es klar
- Erkläre den Score-Breakdown wenn nach einem VIN gefragt wird
- Fahrzeuge mit "Repariert: JA ⚠" immer deutlich warnen

QUARTALSENDE-WISSEN:
- Tesla senkt Preise typischerweise in den letzten 10 Tagen jedes Quartals (März, Juni, September, Dezember)
- Grund: Tesla muss Auslieferungszahlen für Wall Street maximieren — jedes Quartal zählt
- Lieferzeit Deutschland: 5-7 Werktage zwischen Bestellung und Übergabe
- Spätester Bestellzeitpunkt für Quartals-Lieferung: ~5-7 Werktage vor Quartalsende
- WICHTIG: Das Fahrzeug MUSS im selben Quartal ÜBERGEBEN werden, nicht nur bestellt. Am 31. März bestellen reicht NICHT für Q1.
- Nach Quartalsende steigen Preise typischerweise wieder auf Normalniveau
- Beispiel Q1 2026: Quartalsende 31. März → spätestens ~25. März bestellen → Preisfenster ab ~21. März
- Tipp: Fahrzeuge die länger als 14 Tage online sind, haben höheren Verkaufsdruck — bessere Verhandlungsposition`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const marketContext = await buildMarketContext()
    const systemWithContext = `${SYSTEM_PROMPT}\n\n${marketContext}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemWithContext,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('[AI Advisor Error]:', error)
    return Response.json({ error: 'KI-Berater nicht verfügbar' }, { status: 500 })
  }
}
