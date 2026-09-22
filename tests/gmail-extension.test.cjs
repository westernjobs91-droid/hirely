const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { parseHTML } = require('linkedom')

const code = fs.readFileSync('hirely-extension/gmail-engine.js', 'utf8')
const context = {}
vm.runInNewContext(code, context)
const engine = context.HirelyGmailEngine
const manifest = JSON.parse(fs.readFileSync('hirely-extension/manifest.json', 'utf8'))
const gmail = fs.readFileSync('hirely-extension/gmail.js', 'utf8')
const background = fs.readFileSync('hirely-extension/background.js', 'utf8')

test('Gmail parser extracts the visible external sender without reading message content', () => {
  const { document } = parseHTML('<main><div data-message-id="m1" aria-expanded="true"><span class="gD" name="Sanjana Gowda" email="sanjana@example.com">Sanjana Gowda</span><div class="message-body">private text</div></div></main>')
  assert.deepEqual(JSON.parse(JSON.stringify(engine.chooseContact(document, 'recruiter@hirelypro.com'))), { firstName: 'Sanjana', lastName: 'Gowda', email: 'sanjana@example.com' })
})

test('Gmail parser avoids selecting the signed-in recruiter when an external recipient is visible', () => {
  const { document } = parseHTML('<div data-legacy-message-id="m2" aria-expanded="true"><span class="gD" name="Recruiter" email="me@agency.com">Recruiter</span><span class="g2" name="Alex Morgan" email="alex@client.com">Alex Morgan</span></div>')
  assert.deepEqual(JSON.parse(JSON.stringify(engine.chooseContact(document, 'me@agency.com'))), { firstName: 'Alex', lastName: 'Morgan', email: 'alex@client.com' })
})

test('Gmail refresh identity changes for a new route or visible contact', () => {
  const first = { firstName: 'Alex', lastName: 'Morgan', email: 'alex@client.com' }
  const second = { firstName: 'Sam', lastName: 'Lee', email: 'sam@client.com' }
  assert.notEqual(engine.snapshotKey('/mail/u/0/#inbox/a', first), engine.snapshotKey('/mail/u/0/#inbox/b', first))
  assert.notEqual(engine.snapshotKey('/mail/u/0/#inbox/a', first), engine.snapshotKey('/mail/u/0/#inbox/a', second))
})

test('Gmail capture uses a separate script and never requests Gmail API or message bodies', () => {
  const script = manifest.content_scripts.find(item => item.matches.includes('https://mail.google.com/*'))
  assert.deepEqual(script.js, ['gmail-engine.js', 'gmail.js'])
  assert.match(manifest.host_permissions.join(' '), /mail\.google\.com/)
  assert.doesNotMatch(JSON.stringify(manifest), /gmail\.readonly|gmail\.modify|gmail\.send/)
  assert.doesNotMatch(gmail, /message-body|innerHTML\s*\)|textContent\s*\)/)
  assert.match(background, /original_email: null/)
  assert.match(background, /Gmail Extension/)
})

test('an open Gmail panel refreshes when the route or visible contact changes', () => {
  assert.match(gmail, /function captureSnapshot\(\)/)
  assert.match(gmail, /next\.key !== displayedKey && next\.key !== requestedKey/)
  assert.match(gmail, /new MutationObserver/)
  assert.match(gmail, /window\.addEventListener\("hashchange", scheduleRefresh\)/)
})
