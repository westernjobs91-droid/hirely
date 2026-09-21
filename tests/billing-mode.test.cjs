const test = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
function load(env) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/billing-mode.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports, process: { env } })
  return module.exports
}
const check = env => load(env).stripeIsLive()
test('billing requires explicit mode and rejects keys for the other environment', () => {
  for (const env of [{}, { STRIPE_SECRET_KEY: 'sk_live_example' },
    { STRIPE_MODE: 'sandbox', STRIPE_SECRET_KEY: 'sk_live_example' },
    { STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_test_example' },
    { STRIPE_MODE: 'sandbox', STRIPE_SECRET_KEY: '' }]) assert.throws(() => check(env))
  assert.equal(check({ STRIPE_MODE: 'sandbox', STRIPE_SECRET_KEY: 'sk_test_example' }), false)
  assert.equal(check({ STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_example' }), true)
})
test('sandbox checkout is restricted by default and uses exact account IDs', () => {
  const env = { STRIPE_MODE: 'sandbox', STRIPE_SECRET_KEY: 'sk_test_example' }
  assert.throws(() => load(env).assertBillingAccess('user-1'))
  const restricted = load({ ...env, STRIPE_SANDBOX_USER_IDS: ' user-1, user-2 ' })
  assert.doesNotThrow(() => restricted.assertBillingAccess('user-1'))
  assert.throws(() => restricted.assertBillingAccess('user'))
  assert.throws(() => restricted.assertBillingAccess('user-3'))
  assert.doesNotThrow(() => load({ ...env, STRIPE_SANDBOX_ALLOW_ALL: 'true' }).assertBillingAccess('user-3'))
  assert.doesNotThrow(() => load({ STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_example' }).assertBillingAccess('user-3'))
})
