// app/api/enrich/route.ts
// Called by the Chrome extension with a LinkedIn URL slug
// Returns name, title, company, email from Hunter.io
// API key stays server-side — never exposed to the extension

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const linkedinSlug = searchParams.get('linkedin') // e.g. "hrebecca"
  const linkedinUrl = searchParams.get('url')       // e.g. "https://linkedin.com/in/hrebecca"

  if (!linkedinSlug && !linkedinUrl) {
    return NextResponse.json({ error: 'linkedin or url param required' }, { status: 400 })
  }

  // Extract slug from full URL if needed
  const slug = linkedinSlug || (linkedinUrl?.match(/linkedin\.com\/in\/([^/?#]+)/) || [])[1] || ''

  if (!slug) {
    return NextResponse.json({ error: 'Could not extract LinkedIn slug' }, { status: 400 })
  }

  const HUNTER_KEY = process.env.HUNTER_API_KEY
  if (!HUNTER_KEY) {
    return NextResponse.json({ error: 'Hunter API key not configured' }, { status: 500 })
  }

  try {
    // Call Hunter.io People Find API with LinkedIn handle
    const hunterRes = await fetch(
      `https://api.hunter.io/v2/people/find?linkedin=${encodeURIComponent(slug)}&api_key=${HUNTER_KEY}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!hunterRes.ok) {
      const err = await hunterRes.json().catch(() => ({}))
      console.error('[Hirely Enrich] Hunter error:', hunterRes.status, err)
      return NextResponse.json({ found: false, error: 'Hunter lookup failed' }, { status: 200 })
    }

    const data = await hunterRes.json()
    const person = data?.data

    if (!person) {
      return NextResponse.json({ found: false }, { status: 200 })
    }

    // Shape the response for the extension
    return NextResponse.json({
      found: true,
      firstName: person.name?.givenName || '',
      lastName: person.name?.familyName || '',
      name: person.name?.fullName || '',
      title: person.employment?.title || '',
      company: person.employment?.name || '',
      email: person.email || '',
      emailConfidence: person.employment ? 80 : null,
      location: person.location || '',
      photo: person.avatar || '',
      linkedin: slug,
    })

  } catch (err) {
    console.error('[Hirely Enrich] Error:', err)
    return NextResponse.json({ found: false, error: 'Enrichment failed' }, { status: 200 })
  }
}
