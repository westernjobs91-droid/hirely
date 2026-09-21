import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { appOrigin, billingClients, checkoutPrice, listSubscriptions, subscriptionManagementUrl, withBillingLock } from '@/lib/billing'
export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!body || !['solo', 'pro'].includes(body.plan)) return NextResponse.json({ error: 'Choose Solo or Pro. Agency is coming soon.' }, { status: 400 })
  try {
    const { stripe, admin } = billingClients(), origin = appOrigin(), selected = checkoutPrice(body.plan)
    const price = await stripe.prices.retrieve(selected.id)
    if (!price.active || price.currency !== 'usd' || price.unit_amount !== selected.amount || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 || price.recurring.usage_type !== 'licensed') throw new Error('Plan pricing is not configured correctly.')
    const url = await withBillingLock(admin, auth.user.id, async lease => {
      const { data: account, error } = await admin.from('hirely_billing_accounts').select('*').eq('user_id', auth.user.id).maybeSingle()
      if (error) throw new Error('Billing storage unavailable.')
      if (account?.source === 'manual') throw new Error('Your account has a complimentary plan. No purchase is needed.')
      let customer = account?.customer_id
      if (!customer) {
        const created = await stripe.customers.create({ email: auth.user.email, metadata: { supabase_user_id: auth.user.id } }, { idempotencyKey: 'hirely-customer-' + auth.user.id })
        customer = created.id
        const saved = await admin.from('hirely_billing_accounts').upsert({ user_id: auth.user.id, customer_id: customer })
        if (saved.error) throw new Error('Could not save billing account.')
      }
      const subscriptions = await listSubscriptions(stripe, customer)
      if (subscriptions.some(s => !['canceled', 'incomplete_expired'].includes(s.status))) return subscriptionManagementUrl(stripe, customer, subscriptions)
      const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 100 })
      if (open.has_more) throw new Error('Open checkouts need review.')
      for (const session of open.data) {
        if (session.mode !== 'subscription') continue
        if (session.metadata?.hirely_price === selected.id && session.managed_payments?.enabled === true && session.url) return session.url
        await stripe.checkout.sessions.expire(session.id)
      }
      const session = await stripe.checkout.sessions.create({
        customer, mode: 'subscription', managed_payments: { enabled: true }, line_items: [{ price: selected.id, quantity: 1 }],
        success_url: origin + '/?upgraded=true', cancel_url: origin + '/pricing', client_reference_id: auth.user.id,
        metadata: { hirely_price: selected.id }, subscription_data: { metadata: { userId: auth.user.id } },
      }, { idempotencyKey: 'hirely-checkout-' + lease })
      if (!session.url) throw new Error('Checkout unavailable.')
      return session.url
    })
    return NextResponse.json({ url })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout unavailable.' }, { status: 503 }) }
}
