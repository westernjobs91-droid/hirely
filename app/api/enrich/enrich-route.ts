import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company } = await req.json()

    if (!firstName || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hunterKey = process.env.HUNTER_API_KEY
    const apolloKey = process.env.APOLLO_API_KEY

    // STEP 1 — Try Apollo first (better coverage for manufacturing, automotive, etc)
    if (apolloKey) {
      try {
        const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            api_key: apolloKey,
            first_name: firstName,
            last_name: lastName || '',
            organization_name: company,
            reveal_personal_emails: false,
          })
        })

        const apolloData = await apolloRes.json()

        if (apolloData?.person?.email) {
          return NextResponse.json({
            email: apolloData.person.email,
            phone: apolloData.person.phone_numbers?.[0]?.sanitized_number || null,
            linkedinUrl: apolloData.person.linkedin_url || null,
            title: apolloData.person.title || null,
            enriched: true,
            source: 'apollo'
          })
        }
      } catch (e) {
        console.error('Apollo error:', e)
      }
    }

    // STEP 2 — Try Hunter.io as fallback
    if (hunterKey) {
      try {
        const hunterUrl = `https://api.hunter.io/v2/email-finder?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName || '')}&company=${encodeURIComponent(company)}&api_key=${hunterKey}`
        const hunterRes = await fetch(hunterUrl)
        const hunterData = await hunterRes.json()

        if (hunterData?.data?.email) {
          return NextResponse.json({
            email: hunterData.data.email,
            phone: null,
            linkedinUrl: null,
            title: null,
            enriched: true,
            source: 'hunter'
          })
        }
      } catch (e) {
        console.error('Hunter error:', e)
      }
    }

    // STEP 3 — Nothing found
    return NextResponse.json({ enriched: false, source: null })

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
