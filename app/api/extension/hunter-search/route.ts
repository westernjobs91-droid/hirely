import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return NextResponse.json({error:'Unauthorized'},{status:401})
  const {db} = auth
  const { domain } = await req.json()
  if (!domain) return NextResponse.json({ people: [] })

  const {data:credit,error}=await db.rpc('reserve_hirely_credit',{feature:'email'})
  if(error || !credit) return NextResponse.json({people:[],error:'Paid lookup unavailable or request limit reached'},{status:error?503:402})
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
