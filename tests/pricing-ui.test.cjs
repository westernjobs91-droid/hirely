const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const source=fs.readFileSync('app/pricing/page.tsx','utf8')

test('pricing page keeps canonical plans and result-based billing copy',()=>{
  assert.match(source,/Object\.keys\(PLANS\)/)
  assert.match(source,/Email searches use one credit only when an address is returned/)
  assert.match(source,/Failed searches and no-result searches use zero credits/)
})

test('pricing page exposes polished responsive plan and account states',()=>{
  assert.match(source,/lg:grid-cols-3/)
  assert.match(source,/Most popular/)
  assert.match(source,/Checking your account…/)
  assert.match(source,/Current plan/)
  assert.match(source,/Included with your Pro access/)
  assert.match(source,/Free plan included/)
  assert.match(source,/Manage subscription/)
  assert.match(source,/Test mode is active/)
  assert.doesNotMatch(source,/absolute right-5 top-5/)
  assert.doesNotMatch(source,/disabled:cursor-not-allowed/)
})
