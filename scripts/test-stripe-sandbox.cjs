// Opt-in integration harness: real Hirely route handlers, local Supabase and Stripe sandbox.
// Run from the repository: node scripts/test-stripe-sandbox.cjs /private/tmp/hirely-billing-sandbox.<id>
// Never loads production Supabase settings. Stripe secret values are never printed.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const { execFileSync } = require('node:child_process'), { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict'), readline = require('node:readline'), http = require('node:http')
const ts = require('typescript'), { createClient } = require('@supabase/supabase-js'), Stripe = require('stripe')
const root = path.resolve(__dirname, '..'), project = process.argv[2]
assert.match(project || '', /^\/private\/tmp\/hirely-billing-sandbox\.[a-zA-Z0-9]+$/)
const container = 'supabase_db_' + path.basename(project)
const report = [], cache = new Map()
function pass(message) { report.push(message); console.log('PASS:', message) }
function load(file) {
  file = path.resolve(root, file)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(source, { module, exports: module.exports, require(name) {
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name) + '.ts')
    return require(name)
  }, process, URL, Date, Request, Response, AbortSignal, fetch, console, setTimeout, clearTimeout }, { filename: file })
  return module.exports
}
function sql(input) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}
async function main() {
  const file = fs.existsSync(path.join(root, '.env.stripe-test.local')) ? '.env.stripe-test.local' : '.env.local'
  const match = fs.readFileSync(path.join(root, file), 'utf8').match(/^STRIPE_SECRET_KEY\s*=\s*["']?([^\s"']+)/m)
  assert.ok(match && match[1].startsWith('sk_test_'), 'A sandbox secret key is required')
  const stripe = new Stripe(match[1], { timeout: 15000, maxNetworkRetries: 1 })
  assert.equal((await stripe.accounts.retrieve()).id, 'acct_1UHoLHGVdejInC9A', 'Wrong Stripe account')
  const local = JSON.parse(execFileSync('npx', ['--yes', 'supabase', 'status', '--workdir', project, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  assert.match(local.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):54321$/)
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: match[1], NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: 'http://localhost:4317', STRIPE_WEBHOOK_SECRET: 'whsec_' + randomUUID(),
    STRIPE_SOLO_MONTHLY_PRICE_ID: 'price_1UHyGlGVdejInC9AUe6PsKK0',
    STRIPE_PRO_MONTHLY_PRICE_ID: 'price_1UHyHCGVdejInC9AoEY4ZzCM',
  })
  // Minimal pre-existing table fixture, followed by the unmodified production plan migration.
  sql(`create table if not exists public.contacts(id bigint generated always as identity primary key,user_id uuid references auth.users(id),first_name text,notes text,deleted_at timestamptz);
    alter table public.contacts enable row level security;
    drop policy if exists sandbox_owner on public.contacts;
    create policy sandbox_owner on public.contacts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    grant select,insert,update on public.contacts to authenticated;
    grant usage,select on all sequences in schema public to authenticated;
    create table if not exists public.hirely_usage(user_id uuid references auth.users(id),month date,feature text constraint hirely_usage_feature_check check(feature in ('email','meet')),used integer default 0,primary key(user_id,month,feature));
    alter table public.hirely_usage enable row level security;
    revoke all on public.hirely_usage from public,anon,authenticated;`)
  sql(fs.readFileSync(path.join(root, 'supabase/migrations/202609200001_plan_entitlements.sql'), 'utf8'))
  sql("notify pgrst, 'reload schema';")
  const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const authClient = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false } })
  const email = 'hirely-sandbox-' + randomUUID() + '@example.com', password = randomUUID() + randomUUID()
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.equal(created.error, null); const uid = created.data.user.id
  const signed = await authClient.auth.signInWithPassword({ email, password }); assert.equal(signed.error, null)
  const token = signed.data.session.access_token
  const db = createClient(local.API_URL, local.ANON_KEY, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false } })
  const checkout = load('app/api/stripe/checkout/route.ts'), webhook = load('app/api/stripe/webhook/route.ts'), account = load('app/api/account/route.ts')
  const request = (route, body) => new Request('http://localhost:4317' + route, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  async function entitlements() { const res = await account.GET(request('/api/account')); assert.equal(res.status, 200); return res.json() }
  assert.equal((await entitlements()).plan, 'free'); pass('Real local authentication and Free entitlements')
  assert.equal((await db.rpc('reserve_hirely_credit', { feature: 'meet' })).data, false); pass('Free Meet quota blocks use')
  const before = await admin.from('hirely_billing_accounts').select('*').eq('user_id', uid).maybeSingle(); assert.equal(before.data, null)
  let clock
  if (process.argv.includes('--clock')) {
    clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: 'Hirely isolated renewal test' })
    const customer = await stripe.customers.create({ email, test_clock: clock.id, metadata: { supabase_user_id: uid } })
    const seeded = await admin.from('hirely_billing_accounts').insert({ user_id: uid, customer_id: customer.id })
    assert.equal(seeded.error, null)
  }
  const result = await checkout.POST(request('/api/stripe/checkout', { plan: 'solo', userId: 'untrusted-input' }))
  const data = await result.json(); assert.equal(result.status, 200, JSON.stringify(data))
  const { data: billing } = await admin.from('hirely_billing_accounts').select('*').eq('user_id', uid).single()
  assert.equal((await stripe.customers.retrieve(billing.customer_id)).metadata.supabase_user_id, uid)
  const again = await checkout.POST(request('/api/stripe/checkout', { plan: 'solo' })); assert.equal((await again.json()).url, data.url)
  pass('Checkout uses the verified user customer and repeated request reuses session')
  const sessions = await stripe.checkout.sessions.list({ customer: billing.customer_id, status: 'open' })
  assert.equal(sessions.data.length, 1); assert.equal(sessions.data[0].managed_payments.enabled, true); assert.equal(sessions.data[0].livemode, false)
  pass('Real Stripe sandbox accepted Managed Payments parameters')
  const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Hirely sandbox checkout returned. Verification continues in Codex; this page does not grant a plan.'); }).listen(4317, '127.0.0.1')
  console.log('CHECKOUT_URL:', data.url)
  console.log('Commands: sync, upgrade, downgrade, renew, cancel, status, exit. Sandbox customer:', billing.customer_id)
  const supported = ['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']
  let savedEvent
  async function deliver(event) {
    const payload = JSON.stringify(event)
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
    const response = await webhook.POST(new Request('http://localhost:4317/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }))
    assert.equal(response.status, 200, await response.text())
  }
  async function sync() {
    const events = await stripe.events.list({ limit: 100, types: supported })
    const ours = events.data.filter(e => (typeof e.data.object.customer === 'string' ? e.data.object.customer : e.data.object.customer?.id) === billing.customer_id)
    assert.ok(ours.length, 'No relevant Stripe event yet; finish checkout first')
    savedEvent ||= ours.find(e => e.type === 'checkout.session.completed') || ours[ours.length - 1]
    for (const event of ours) await deliver(event)
    await deliver(savedEvent)
    const current = await entitlements(); console.log('ENTITLEMENTS:', JSON.stringify(current))
    pass('Real Stripe events processed and replayed through signature-verified webhook handler')
    return current
  }
  const lines = readline.createInterface({ input: process.stdin, terminal: false })
  for await (const line of lines) {
    try {
      const command = line.trim()
      if (command === 'exit') { server.close(); lines.close(); break }
      if (command === 'status') { console.log('ENTITLEMENTS:', JSON.stringify(await entitlements())); continue }
      if (command === 'sync') { const current = await sync(); assert.equal(current.plan, 'solo'); assert.equal(current.email_limit, 50); pass('Paid Solo activation grants 50 email / 25 Meet / 50 draft quota'); continue }
      if (command === 'renew') {
        assert.ok(clock, 'Start with --clock for renewal tests')
        const subscriptions = await stripe.subscriptions.list({ customer: billing.customer_id, status: 'active' })
        assert.equal(subscriptions.data.length, 1)
        const sub = subscriptions.data[0]; assert.equal(sub.livemode, false)
        const end = sub.items.data[0].current_period_end
        const prior = await admin.from('hirely_billing_accounts').select('valid_until').eq('user_id', uid).single()
        await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: end + 120 })
        let ready = false
        for (let n = 0; n < 30; n++) {
          const state = await stripe.testHelpers.testClocks.retrieve(clock.id)
          if (state.status === 'ready') { ready = true; break }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        assert.ok(ready, 'Test clock did not become ready')
        const current = await sync()
        assert.equal(current.plan, 'solo')
        const updated = await admin.from('hirely_billing_accounts').select('valid_until').eq('user_id', uid).single()
        assert.ok(new Date(updated.data.valid_until) > new Date(prior.data.valid_until)); pass('Successful renewal extends paid entitlement expiry')
        continue
      }
      if (['upgrade','downgrade','cancel'].includes(command)) {
        const subscriptions = await stripe.subscriptions.list({ customer: billing.customer_id, status: 'active' }); assert.equal(subscriptions.data.length, 1)
        const sub = subscriptions.data[0]; assert.equal(sub.livemode, false)
        if (command === 'cancel') await stripe.subscriptions.cancel(sub.id)
        else await stripe.subscriptions.update(sub.id, { items: [{ id: sub.items.data[0].id, price: process.env[command === 'upgrade' ? 'STRIPE_PRO_MONTHLY_PRICE_ID' : 'STRIPE_SOLO_MONTHLY_PRICE_ID'] }], proration_behavior: 'none' })
        const current = await sync(); assert.equal(current.plan, command === 'cancel' ? 'free' : command === 'upgrade' ? 'pro' : 'solo')
        pass(command + ' updates plan correctly even after replaying the earlier purchase event')
      }
    } catch (error) { console.error('TEST FAILED:', error.message) }
  }
  console.log('Completed checks:', report.length)
}
main().catch(error => { console.error('Sandbox setup failed:', error.message); process.exitCode = 1 })
