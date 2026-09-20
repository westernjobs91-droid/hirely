import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { getEntitlements } from '@/lib/plans'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await getEntitlements(auth.db), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Plan limits unavailable.' }, { status: 503 }) }
}
