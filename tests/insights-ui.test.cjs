const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const analytics = fs.readFileSync(path.join(root, 'components/AnalyticsView.tsx'), 'utf8')
const finder = fs.readFileSync(path.join(root, 'components/EnrichmentView.tsx'), 'utf8')

test('analytics uses responsive grids instead of desktop-only columns', () => {
  assert.match(analytics, /grid grid-cols-2 gap-3 xl:grid-cols-4/)
  assert.match(analytics, /grid gap-4 lg:grid-cols-3/)
  assert.match(analytics, /grid gap-4 md:grid-cols-2 xl:grid-cols-3/)
  assert.doesNotMatch(analytics, /grid grid-cols-4 gap-4/)
  assert.doesNotMatch(analytics, /grid grid-cols-3 gap-4/)
})

test('email finder has dedicated mobile cards and a fixed desktop directory', () => {
  assert.match(finder, /divide-y divide-slate-100 lg:hidden/)
  assert.match(finder, /hidden lg:block/)
  assert.match(finder, /table-fixed/)
  assert.match(finder, /Find and verify work emails/)
  assert.match(finder, /Pay only for a returned result/)
  assert.match(finder, /No result found\. No credit used\./)
})
