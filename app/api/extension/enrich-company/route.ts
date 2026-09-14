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
    .in('cache_key', Array.from(new Set([cKey, companyName.toLowerCase().trim()])))
    .order('created_at', { ascending: false }).limit(1)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached?.data) {
    console.log('[enrich-company] cache hit:', cKey)
    return NextResponse.json({ info: cached.data, people: [], fromCache: true })
  }

  return NextResponse.json({ info: null, people: [], message: 'No saved company data. Add a company pattern in the admin page.' })

}
