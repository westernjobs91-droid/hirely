const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const view = fs.readFileSync('components/IntegrationsView.tsx', 'utf8')
const pane = fs.readFileSync('public/outlook/taskpane.html', 'utf8')
const nextConfig = fs.readFileSync('next.config.js', 'utf8')
const manifest = fs.readFileSync('public/outlook/manifest.xml', 'utf8')

test('integrations page explains current plan access and the Outlook workflow', () => {
  assert.match(view, /Your integration access/)
  assert.match(view, /Solo \+ Pro/)
  assert.match(view, /LinkedIn \+ Gmail \+ Outlook/)
  assert.match(view, /Add from file/)
  assert.doesNotMatch(view, /Add from URL/)
  assert.match(view, /download="hirely-outlook-manifest\.xml"/)
  assert.match(view, /Gmail capture/)
  assert.match(view, /hirely-extension-1\.4\.2\.zip/)
  assert.match(view, /overflow-x-hidden/)
  assert.match(view, /flex flex-wrap items-center justify-between/)
})

test('Outlook capture avoids reading or saving message bodies', () => {
  assert.doesNotMatch(pane, /item\.body\.getAsync/)
  assert.match(pane, /originalEmail: ""/)
  assert.match(pane, /name and email only/)
})

test('Outlook task-pane pages can be embedded by Outlook', () => {
  assert.match(nextConfig, /outlook\/(?:taskpane\|commands|\(\?:taskpane\|commands\))/)
  assert.match(nextConfig, /X-Frame-Options/)
  assert.match(nextConfig, /\(\?!outlook\//)
})

test('Outlook store manifest uses certification-sized icons and support page', () => {
  assert.match(manifest, /IconUrl DefaultValue="https:\/\/app\.hirelypro\.com\/outlook\/icons\/icon-64\.png"/)
  assert.match(manifest, /HighResolutionIconUrl DefaultValue="https:\/\/app\.hirelypro\.com\/outlook\/icons\/icon-128\.png"/)
  assert.match(manifest, /SupportUrl DefaultValue="https:\/\/app\.hirelypro\.com\/support"/)
})
