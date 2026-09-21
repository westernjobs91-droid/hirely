import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { PLANS, Plan } from './plans'
import { stripeIsLive, assertBillingAccess } from './billing-mode'
export { assertBillingAccess } from './billing-mode'
export function billingClients() {
  stripeIsLive()
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Billing is not configured.')
  return { stripe: new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 }),
    admin: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) }
}
export function appOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('Invalid app URL.')
  return url.origin
}
export function checkoutPrice(plan: string) {
  if (plan !== 'solo' && plan !== 'pro') throw new Error('This plan is not available for purchase.')
  const id = process.env[plan === 'solo' ? 'STRIPE_SOLO_MONTHLY_PRICE_ID' : 'STRIPE_PRO_MONTHLY_PRICE_ID']
  if (!id) throw new Error('This plan is not available for purchase yet.')
  return { id, plan, amount: PLANS[plan].monthlyUsd * 100 }
}
export function planForPrice(id: string): Plan | null {
  if (id === process.env.STRIPE_SOLO_MONTHLY_PRICE_ID || id === 'price_1TrVW7JYp8fgJBx4sWJvf14I') return 'solo'
  if (id === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || id === 'price_1TrVWtJYp8fgJBx4CqOBQ531') return 'pro'
  return null
}
export async function withBillingLock<T>(admin: any, uid: string, work: (lease: string) => Promise<T>): Promise<T> {
  const lease = randomUUID()
  const { data, error } = await admin.rpc('hirely_claim_billing_lock', { uid, lease })
  if (error || !data) throw new Error('Billing is busy. Please retry shortly.')
  try { return await work(lease) }
  finally { await admin.from('hirely_billing_locks').delete().eq('user_id', uid).eq('token', lease) }
}
export async function listSubscriptions(stripe: any, customer: string) {
  const result = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
  if (result.has_more) throw new Error('Billing history needs review.')
  return result.data as any[]
}
export async function subscriptionManagementUrl(stripe: any, customer: string, subscriptions?: any[]) {
  const history = subscriptions || await listSubscriptions(stripe, customer)
  const current = history.filter(s => !['canceled', 'incomplete_expired'].includes(s.status))
  // Managed Payments owns the payment mandate. Its card and order management live in Link.
  if ((current.length ? current : history).some(s => s.managed_payments?.enabled)) return 'https://app.link.com/'
  return (await stripe.billingPortal.sessions.create({ customer, return_url: appOrigin() + '/pricing' })).url
}
export async function syncCustomer(stripe: any, admin: any, customer: string) {
  const { data: account, error } = await admin.from('hirely_billing_accounts').select('*').eq('customer_id', customer).maybeSingle()
  if (error) throw new Error('Billing storage unavailable.')
  if (!account) throw new Error('Customer needs billing reconciliation.')
  if (account.source === 'manual') return
  assertBillingAccess(account.user_id)
  await withBillingLock(admin, account.user_id, async lease => {
    // Read current Stripe state under a lease, never historical event metadata.
    const subscriptions = await listSubscriptions(stripe, customer)
    const paid = subscriptions.filter(s => ['active', 'trialing'].includes(s.status))
    if (paid.length > 1) throw new Error('Multiple active subscriptions need review.')
    const sub = paid[0], items = sub?.items?.data || []
    const plan = sub ? planForPrice(items[0]?.price?.id) : 'free'
    if (!plan || (sub && (items.length !== 1 || items[0].quantity !== 1))) throw new Error('Unsupported subscription configuration.')
    const until = sub ? (items[0].current_period_end || sub.current_period_end) : null
    if (sub && (!Number.isFinite(until) || until <= 0)) throw new Error('Subscription expiry is unavailable.')
    const { data, error: saveError } = await admin.rpc('hirely_sync_billing', {
      uid: account.user_id, lease, customer, subscription: sub?.id || null,
      paid_plan: plan, paid_status: sub?.status || 'inactive', expiry: until ? new Date(until * 1000).toISOString() : null,
    })
    if (saveError || !data) throw new Error('Billing update could not be saved. Retry required.')
  })
}
