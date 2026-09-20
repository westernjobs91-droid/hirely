import { NextResponse } from 'next/server'
import { billingClients, syncCustomer } from '@/lib/billing'
export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  let clients
  try { clients = billingClients() } catch { return NextResponse.json({ error: 'Billing unavailable' }, { status: 503 }) }
  const { stripe, admin } = clients
  let event
  try { event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') || '', process.env.STRIPE_WEBHOOK_SECRET) }
  catch { return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  const supported = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed', 'invoice.paid', 'invoice.payment_failed']
  if (!supported.includes(event.type)) return NextResponse.json({ received: true })
  const object = event.data.object as any
  const customer = typeof object.customer === 'string' ? object.customer : object.customer?.id
  if (!customer) return NextResponse.json({ error: 'Missing customer' }, { status: 400 })
  try {
    await syncCustomer(stripe, admin, customer)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Billing synchronization requires retry' }, { status: 503 })
  }
}
