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

  const { domain } = await req.json()
  if (!domain) return NextResponse.json({ people: [] })

  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${process.env.HUNTER_API_KEY}`,
      { method: 'GET' }
    )
    if (!res.ok) return NextResponse.json({ people: [] })

    const data = await res.json()
    const people = (data.data?.emails || []).map((e: any) => ({
      first_name: e.first_name || '',
      last_name: e.last_name || '',
      position: e.position || '',
      linkedin: e.linkedin || '',
    }))

    return NextResponse.json({ people })
  } catch (e) {
    console.error('[hunter-search]', e)
    return NextResponse.json({ people: [] })
  }
}
