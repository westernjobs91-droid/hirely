import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company } = await req.json()

    if (!firstName || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.HUNTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Hunter API key not configured' }, { status: 500 })
    }

    // Find email using Hunter.io email finder
    const url = `https://api.hunter.io/v2/email-finder?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName || '')}&company=${encodeURIComponent(company)}&api_key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.data?.email) {
      return NextResponse.json({
        email: data.data.email,
        score: data.data.score,
        enriched: true
      })
    }

    // If email finder fails try domain search
    const domainUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}&api_key=${apiKey}&limit=1`
    const domainRes = await fetch(domainUrl)
    const domainData = await domainRes.json()

    if (domainData.data?.domain) {
      return NextResponse.json({
        domain: domainData.data.domain,
        enriched: true
      })
    }

    return NextResponse.json({ enriched: false })

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
