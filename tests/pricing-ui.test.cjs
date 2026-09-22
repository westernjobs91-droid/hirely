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
  assert.match(source,/Loading plan…/)
  assert.match(source,/Current plan/)
  assert.match(source,/Manage subscription/)
  assert.match(source,/Test mode is active/)
})
