const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const view = fs.readFileSync('components/IntegrationsView.tsx', 'utf8')
const pane = fs.readFileSync('public/outlook/taskpane.html', 'utf8')

test('integrations page explains current plan access and the Outlook workflow', () => {
  assert.match(view, /Your integration access/)
  assert.match(view, /Solo \+ Pro/)
  assert.match(view, /LinkedIn \+ Outlook/)
  assert.match(view, /Add from file/)
  assert.doesNotMatch(view, /Add from URL/)
  assert.match(view, /download="hirely-outlook-manifest\.xml"/)
  assert.match(view, /overflow-x-hidden/)
  assert.match(view, /flex flex-wrap items-center justify-between/)
})

test('Outlook capture avoids reading or saving message bodies', () => {
  assert.doesNotMatch(pane, /item\.body\.getAsync/)
  assert.match(pane, /originalEmail: ""/)
  assert.match(pane, /name and email only/)
})
