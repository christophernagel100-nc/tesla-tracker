import { NextRequest, NextResponse } from 'next/server'

// This proxy is needed because Cloudflare blocks n8n server's requests to Tesla API
// Vercel's infrastructure has legitimate browser-like TLS fingerprints

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    const teslaUrl = `https://www.tesla.com/inventory/api/v4/inventory-results?query=${encodeURIComponent(query)}`

    const response = await fetch(teslaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.tesla.com/de_de/inventory/used/my',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Tesla API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Tesla Proxy Error]:', error)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
