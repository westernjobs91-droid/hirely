// Require an explicit choice so changing a key cannot silently enable real charges.
export function stripeIsLive() {
  const mode = process.env.STRIPE_MODE
  const key = process.env.STRIPE_SECRET_KEY || ''
  if (mode !== 'sandbox' && mode !== 'live') throw new Error('Stripe mode is not configured.')
  const prefix = mode === 'live' ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/
  if (!prefix.test(key)) throw new Error('Stripe key does not match the configured billing mode.')
  return mode === 'live'
}

export function assertBillingAccess(userId: string) {
  if (stripeIsLive()) return
  if (process.env.STRIPE_SANDBOX_ALLOW_ALL === 'true') return
  const allowed = (process.env.STRIPE_SANDBOX_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
  if (!allowed.includes(userId)) throw new Error('Billing is being tested. Paid subscriptions are not available for this account yet.')
}
