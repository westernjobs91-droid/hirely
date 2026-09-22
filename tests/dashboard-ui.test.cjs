const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const ReactDOM = require('react-dom/client')
const { parseHTML } = require('linkedom')

function loadComponent(path, mocks = {}) {
  const source = fs.readFileSync(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: name => mocks[name] || require(name),
    console,
    setTimeout,
    clearTimeout,
    window: global.window,
  })
  return module.exports.default
}

function dom() {
  const { document, window } = parseHTML('<html><body><div id="root"></div></body></html>')
  global.window = window
  global.document = document
  global.navigator = window.navigator
  global.IS_REACT_ACT_ENVIRONMENT = true
  return { document, window, root: ReactDOM.createRoot(document.querySelector('#root')) }
}

const supabase = {
  auth: { getUser: async () => ({ data: { user: null } }) },
  from: () => { throw new Error('Sidebar must not query usage without a user') },
}

test('Cmd/Ctrl+K focuses and selects contact search', async () => {
  const page = dom()
  const Sidebar = loadComponent('components/Sidebar.tsx', { '@/lib/supabase': { supabase }, '@/types': {} })
  await React.act(async () => page.root.render(React.createElement(Sidebar, {
    activeNav: 'dashboard', onNavChange() {}, contactCount: 0, overdueCount: 0,
    userName: 'Test User', userEmail: 'test@example.com', onLogout() {},
    searchQuery: 'Jane', onSearchChange() {},
  })))
  const input = page.document.querySelector('input[aria-label="Search contacts"]')
  let focused = 0, selected = 0
  input.focus = () => { focused++ }
  input.select = () => { selected++ }
  for (const key of [{ metaKey: true }, { ctrlKey: true }]) {
    const event = new page.window.Event('keydown', { cancelable: true })
    Object.defineProperties(event, { key: { value: 'k' }, metaKey: { value: !!key.metaKey }, ctrlKey: { value: !!key.ctrlKey } })
    page.window.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
  }
  assert.equal(focused, 2)
  assert.equal(selected, 2)
  await React.act(async () => page.root.unmount())
})

test('mobile navigation opens, closes, and exposes billing', async () => {
  const page = dom()
  const Sidebar = loadComponent('components/Sidebar.tsx', { '@/lib/supabase': { supabase }, '@/types': {} })
  let open = false
  const render = async () => React.act(async () => page.root.render(React.createElement(Sidebar, {
    activeNav: 'dashboard', onNavChange() {}, contactCount: 0, overdueCount: 0,
    userName: 'Test User', userEmail: 'test@example.com', onLogout() {},
    searchQuery: '', onSearchChange() {}, mobileOpen: open,
    onMobileClose: () => { open = false },
  })))
  await render()
  assert.match(page.document.querySelector('aside').className, /-translate-x-full/)
  assert.equal(page.document.querySelector('a[href="/pricing"]').textContent.trim(), 'Plan & billing')
  open = true
  await render()
  assert.match(page.document.querySelector('aside').className, /translate-x-0/)
  await React.act(async () => page.document.querySelector('button[aria-label="Close navigation"]').dispatchEvent(new page.window.Event('click', { bubbles: true })))
  assert.equal(open, false)
  await React.act(async () => page.root.unmount())
})

test('Done contacts can move back to Today or Coming up from the visible stage badge', async () => {
  const page = dom()
  const ContactCard = loadComponent('components/ContactCard.tsx', {
    '@/lib/follow-up': { followUpDay: contact => contact.sentDate || '' },
    './ContactPhoto': { __esModule: true, default: () => React.createElement('span', null, 'Photo') },
    '@/types': {},
  })
  const moves = []
  const contact = { id:'done-1', firstName:'Maya', lastName:'Carter', email:'maya@example.com', company:'Northstar', jobTitle:'HR Director', avatarColor:'#2563EB', status:'no-response', statusLabel:'Done', column:'done', sentDate:'', createdAt:'2026-09-20' }
  await React.act(async () => page.root.render(React.createElement(ContactCard, { contact, isSelected:false, onClick() {}, onDelete() {}, onMove:(id,target)=>moves.push([id,target]) })))
  const labels = Array.from(page.document.querySelectorAll('button')).map(button => button.textContent.trim())
  assert.ok(labels.includes('Move to Follow up today'))
  assert.ok(labels.includes('Move to Coming up'))
  assert.ok(!labels.includes('Move to Done'))
  assert.ok(page.document.querySelector('[aria-label="Change stage from Done"]'))
  const upcoming = Array.from(page.document.querySelectorAll('button')).find(button => button.textContent.trim()==='Move to Coming up')
  await React.act(async () => upcoming.dispatchEvent(new page.window.Event('click', { bubbles:true })))
  assert.deepEqual(moves, [['done-1','upcoming']])
  await React.act(async () => page.root.unmount())
})

test('dashboard and contacts provide dedicated mobile layouts', () => {
  const dashboard = fs.readFileSync('app/page.tsx','utf8')
  const contacts = fs.readFileSync('components/ContactListView.tsx','utf8')
  const panel = fs.readFileSync('components/ContactPanel.tsx','utf8')
  assert.match(dashboard, /snap-x snap-mandatory/)
  assert.match(dashboard, /h-dvh/)
  assert.match(contacts, /md:hidden[^>]*aria-label="Contacts"/)
  assert.match(contacts, /hidden bg-white[^>]*md:block/)
  assert.match(panel, /h-dvh/)
})

test('Import modal routes available sources and disables unfinished imports', async () => {
  const page = dom()
  const ImportModal = loadComponent('components/ImportModal.tsx')
  let closed = 0, opened = 0
  await React.act(async () => page.root.render(React.createElement(ImportModal, {
    onClose: () => { closed++ }, onOpenIntegrations: () => { opened++ },
  })))
  const buttons = Array.from(page.document.querySelectorAll('button'))
  const linkedIn = buttons.find(button => button.getAttribute('aria-label') === 'From LinkedIn: open setup')
  const csv = buttons.find(button => button.getAttribute('aria-label') === 'CSV / Excel: coming soon')
  assert.ok(linkedIn)
  assert.equal(csv.disabled, true)
  await React.act(async () => linkedIn.dispatchEvent(new page.window.Event('click', { bubbles: true })))
  assert.equal(closed, 1)
  assert.equal(opened, 1)
  assert.doesNotMatch(page.document.body.textContent, /auto-enriched with Hunter|Apollo data/)
  await React.act(async () => page.root.unmount())
})
