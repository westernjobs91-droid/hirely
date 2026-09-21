const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

test('landing plan claims match the product and legal links are real', () => {
  const html = fs.readFileSync('landing/index.html', 'utf8')
  for (const claim of ['$0', '$29', '$59', '50 active contacts', '5 email credits/month', '1,000 active contacts', '200 email credits/month']) {
    assert.match(html, new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(html, /https:\/\/app\.hirelypro\.com\/privacy/)
  assert.match(html, /https:\/\/app\.hirelypro\.com\/terms/)
  assert.doesNotMatch(html, /\$19|\$39|\$99|47 recruiters|Free during beta|href="#"|name=['"]waitlist/)
})
