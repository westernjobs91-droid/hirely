import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Auth check — verify the caller is a logged-in Hirely user
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyName, linkedinSlug } = await req.json()
  if (!companyName) return NextResponse.json({ info: null, people: [] })

  try {
    let url = `https://api.peopledatalabs.com/v5/company/enrich?api_key=${process.env.PDL_API_KEY}`
    if (linkedinSlug) url += `&linkedin_url=${encodeURIComponent('https://www.linkedin.com/company/' + linkedinSlug)}`
    url += `&name=${encodeURIComponent(companyName)}`

    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return NextResponse.json({ info: null, people: [] })

    const pdl = await res.json()
    if (pdl.status !== 200) return NextResponse.json({ info: null, people: [] })

    const info = {
      name: pdl.display_name || pdl.name || companyName,
      website: pdl.website || '',
      domain: pdl.website
        ? pdl.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        : '',
      industry: pdl.industry || '',
      size: pdl.size || '',
      employeeCount: pdl.employee_count || null,
      founded: pdl.founded || null,
      location: [pdl.location?.locality, pdl.location?.region, pdl.location?.country]
        .filter(Boolean).join(', '),
      summary: pdl.summary || '',
      tags: pdl.tags || [],
      linkedinUrl: pdl.linkedin_url || '',
    }

    return NextResponse.json({ info, people: [] })
  } catch (e) {
    console.error('[enrich-company]', e)
    return NextResponse.json({ info: null, people: [] })
  }
}
