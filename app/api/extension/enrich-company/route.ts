import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function companyCacheKey(companyName: string, slug?: string) {
  return slug ? `slug:${slug.toLowerCase().trim()}` : companyName.toLowerCase().trim()
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyName, linkedinSlug } = await req.json()
  if (!companyName) return NextResponse.json({ info: null, people: [] })

  const cKey = companyCacheKey(companyName, linkedinSlug)

  // ── Check cache first ─────────────────────────────────────────────────
  const { data: cached } = await serviceClient()
    .from('company_cache')
    .select('*')
    .eq('cache_key', cKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached?.data) {
    console.log('[enrich-company] cache hit:', cKey)
    return NextResponse.json({ info: cached.data, people: [], fromCache: true })
  }

  // ── Cache miss — call PDL ─────────────────────────────────────────────
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

    // Save to cache
    await serviceClient().from('company_cache').upsert({
      cache_key: cKey,
      company_name: companyName,
      data: info,
      expires_at: '2099-01-01T00:00:00.000Z',
    }, { onConflict: 'cache_key' })

    return NextResponse.json({ info, people: [] })
  } catch (e) {
    console.error('[enrich-company]', e)
    return NextResponse.json({ info: null, people: [] })
  }
}
