// app/api/enrich/route.ts
// Calls Hunter.io with LinkedIn slug to get name, title, company, email
// Uses email-finder endpoint which supports linkedin handle parameter

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const linkedinSlug = searchParams.get('linkedin')
  const linkedinUrl = searchParams.get('url')

  // Extract slug from full URL if needed
  const slug = linkedinSlug ||
    (linkedinUrl?.match(/linkedin\.com\/in\/([^/?#]+)/) || [])[1] || ''

  if (!slug) {
    return NextResponse.json({ error: 'linkedin param required' }, { status: 400 })
  }

  const HUNTER_KEY = process.env.HUNTER_API_KEY
  if (!HUNTER_KEY) {
    return NextResponse.json({ error: 'Hunter API key not configured' }, { status: 500 })
  }

  // Try 1: Combined enrichment (returns full profile + email if available)
  // This is Hunter's newest endpoint supporting linkedin handle
  try {
    const enrichRes = await fetch(
      `https://api.hunter.io/v2/combined-enrichment?linkedin=${encodeURIComponent(slug)}&api_key=${HUNTER_KEY}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    console.log('[Hirely Enrich] combined-enrichment status:', enrichRes.status)

    if (enrichRes.ok) {
      const data = await enrichRes.json()
      const person = data?.data?.person
      const company = data?.data?.company

      if (person) {
        return NextResponse.json({
          found: true,
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          name: [person.first_name, person.last_name].filter(Boolean).join(' '),
          title: person.employment?.title || '',
          company: person.employment?.name || company?.name || '',
          email: person.email || '',
          photo: person.avatar || '',
          location: person.location || '',
          linkedin: slug,
        })
      }
    }
  } catch(e) {
    console.error('[Hirely Enrich] combined-enrichment error:', e)
  }

  // Try 2: Email Finder with linkedin handle
  // Returns email + basic profile data
  try {
    const finderRes = await fetch(
      `https://api.hunter.io/v2/email-finder?linkedin=${encodeURIComponent(slug)}&api_key=${HUNTER_KEY}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    console.log('[Hirely Enrich] email-finder status:', finderRes.status)

    if (finderRes.ok) {
      const data = await finderRes.json()
      const person = data?.data

      if (person && (person.email || person.first_name)) {
        return NextResponse.json({
          found: true,
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          name: [person.first_name, person.last_name].filter(Boolean).join(' '),
          title: person.position || '',
          company: person.company || '',
          email: person.email || '',
          photo: person.photo_url || '',
          linkedin: slug,
        })
      }
    }
  } catch(e) {
    console.error('[Hirely Enrich] email-finder error:', e)
  }

  // Try 3: People enrichment endpoint
  try {
    const peopleRes = await fetch(
      `https://api.hunter.io/v2/people/find?linkedin=${encodeURIComponent(slug)}&api_key=${HUNTER_KEY}`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    console.log('[Hirely Enrich] people/find status:', peopleRes.status)

    if (peopleRes.ok) {
      const data = await peopleRes.json()
      const person = data?.data

      if (person) {
        return NextResponse.json({
          found: true,
          firstName: person.name?.givenName || '',
          lastName: person.name?.familyName || '',
          name: person.name?.fullName || '',
          title: person.employment?.title || '',
          company: person.employment?.name || '',
          email: person.email || '',
          photo: person.avatar || '',
          linkedin: slug,
        })
      }
    }
  } catch(e) {
    console.error('[Hirely Enrich] people/find error:', e)
  }

  // All three failed — return not found so extension falls back to DOM scrape
  return NextResponse.json({ found: false })
}
