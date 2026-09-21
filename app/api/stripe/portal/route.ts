import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { billingClients, subscriptionManagementUrl } from '@/lib/billing'
export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { stripe, admin } = billingClients()
    const { data, error } = await admin.from('hirely_billing_accounts').select('customer_id,source').eq('user_id', auth.user.id).maybeSingle()
    if (error) throw error
    if (!data?.customer_id || data.source === 'manual') return NextResponse.json({ error: 'No paid subscription to manage.' }, { status: 404 })
    return NextResponse.json({ url: await subscriptionManagementUrl(stripe, data.customer_id) })
  } catch { return NextResponse.json({ error: 'Billing portal unavailable.' }, { status: 503 }) }
}
