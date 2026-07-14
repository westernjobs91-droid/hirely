import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { linkedinUrl } = await req.json()
  if (!linkedinUrl) return NextResponse.json({ error: 'linkedinUrl required' }, { status: 400 })

  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) return NextResponse.json({ error: 'RapidAPI not configured' }, { status: 500 })

  // Clean the URL — strip query params, trailing slash
  const cleanUrl = linkedinUrl.split('?')[0].replace(/\/$/, '')

  try {
    const res = await fetch(
      `https://fresh-linkedin-profile-data.p.rapidapi.com/get-profile-data-by-linkedin-url?linkedin_url=${encodeURIComponent(cleanUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
        }
      }
    )

    if (!res.ok) {
      console.error('[enrich-profile] RapidAPI error', res.status)
      return NextResponse.json({ ok: false, error: 'Profile lookup failed' })
    }

    const data = await res.json()

    // Fresh LinkedIn Profile Data response shape:
    // { first_name, last_name, full_name, headline, current_company_name,
    //   current_company: { name }, profile_picture, location, about }
    const profile = data.data ?? data

    const firstName   = profile.first_name || profile.full_name?.split(' ')[0] || ''
    const lastName    = profile.last_name  || profile.full_name?.split(' ').slice(1).join(' ') || ''
    const headline    = profile.headline || ''
    const company     = profile.current_company_name || profile.current_company?.name || ''
    const photo       = profile.profile_picture || profile.photo_url || ''
    const location    = profile.location || ''

    if (!firstName && !lastName) {
      return NextResponse.json({ ok: false, error: 'Profile not found' })
    }

    return NextResponse.json({
      ok: true,
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(' '),
      headline,
      company,
      photo,
      location,
    })

  } catch (e) {
    console.error('[enrich-profile]', e)
    return NextResponse.json({ ok: false, error: 'Profile lookup failed' }, { status: 500 })
  }
}
