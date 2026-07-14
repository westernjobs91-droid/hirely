import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
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
  if (!rapidApiKey) return NextResponse.json({ ok: false, error: 'RapidAPI not configured' }, { status: 500 })

  const cleanUrl = linkedinUrl.split('?')[0].replace(/\/$/, '')

  try {
    // Check if contact already exists in DB for this user — free, no API credit burned
    const { data: cached } = await supabase
      .from('contacts')
      .select('first_name, last_name, job_title, company')
      .eq('linkedin_url', cleanUrl)
      .eq('user_id', user.id)
      .single()

    if (cached?.first_name) {
      return NextResponse.json({
        ok: true,
        firstName: cached.first_name,
        lastName: cached.last_name || '',
        name: [cached.first_name, cached.last_name].filter(Boolean).join(' '),
        headline: cached.job_title || '',
        company: cached.company || '',
        photo: '',
        source: 'cache'
      })
    }

    // RockApis Real-Time LinkedIn Scraper API — "Get Profile Data By URL"
    // Host: linkedin-data-api.p.rapidapi.com
    // Endpoint: GET /get-profile-data-by-url?url=<linkedinUrl>
    const res = await fetch(
      `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=${encodeURIComponent(cleanUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
        }
      }
    )

    if (!res.ok) {
      console.error('[enrich-profile] RockApis error', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ ok: false, error: 'Profile lookup failed' })
    }

    const json = await res.json()

    // RockApis response shape (v2):
    // { success, data: { firstName, lastName, headline, geo: { full }, profilePicture,
    //   position: [{ companyName, title }] } }
    const profile = json.data ?? json

    const firstName = profile.firstName || profile.first_name || ''
    const lastName  = profile.lastName  || profile.last_name  || ''
    const headline  = profile.headline  || profile.summary    || ''
    const company   =
      profile.position?.[0]?.companyName ||
      profile.experiences?.[0]?.companyName ||
      profile.current_company_name ||
      profile.currentPositionCompanyName ||
      ''
    const photo     = profile.profilePicture || profile.profile_picture || profile.photoUrl || ''
    const location  = profile.geo?.full || profile.location || ''

    if (!firstName && !lastName) {
      console.error('[enrich-profile] no name in response:', JSON.stringify(json).slice(0, 300))
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
