'use client'

import { useState } from 'react'
import { Contact } from '@/types'
import { supabase } from '@/lib/supabase'
import ContactPhoto from './ContactPhoto'
import EmailStatusBadge from './EmailStatusBadge'

interface Props {
  contacts: Contact[]
  onSelect: (contact: Contact) => void
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<boolean>
}

function ContactIdentity({ contact, onSelect }: { contact: Contact; onSelect: (contact: Contact) => void }) {
  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`
  return (
    <button onClick={() => onSelect(contact)} className="group flex w-full min-w-0 items-center gap-3 overflow-hidden text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-white" style={{ background: contact.avatarColor || '#2563eb' }}>
        <ContactPhoto url={contact.photoUrl} initials={initials} name={`${contact.firstName} ${contact.lastName}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-slate-900 group-hover:text-blue-600">{contact.firstName} {contact.lastName}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{contact.jobTitle || 'Open contact'}</span>
      </span>
    </button>
  )
}

export default function EnrichmentView({ contacts, onSelect, onUpdateContact }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const visible = contacts.filter(contact =>
    [contact.firstName, contact.lastName, contact.company, contact.email].join(' ').toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'all' || filter === 'missing' && !contact.email || filter === 'review' && !!contact.email && contact.emailStatus !== 'valid')
  )

  async function run(contact: Contact, action = 'find') {
    setBusy(String(contact.id))
    setMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ contactId: contact.id, action, allowPaid: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Lookup failed')
      if (data.email) {
        const saved = await onUpdateContact(contact.id, {
          email: data.email,
          enriched: true,
          emailStatus: data.emailStatus,
          emailSource: data.emailSource,
          emailCheckedAt: data.emailCheckedAt,
          emailEvidence: data.emailEvidence,
        })
        if (!saved) throw new Error('Could not refresh contact')
        setMessage('Result saved. 1 email credit used.')
      } else {
        setMessage(data.message || 'No result found. No credit used.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lookup failed')
    } finally {
      setBusy(null)
    }
  }

  const counts = {
    all: contacts.length,
    missing: contacts.filter(contact => !contact.email).length,
    review: contacts.filter(contact => contact.email && contact.emailStatus !== 'valid').length,
  }

  const filters = [
    { key: 'all', label: 'All contacts', value: counts.all, color: 'bg-blue-50 text-blue-700' },
    { key: 'missing', label: 'Missing email', value: counts.missing, color: 'bg-amber-50 text-amber-700' },
    { key: 'review', label: 'Review needed', value: counts.review, color: 'bg-violet-50 text-violet-700' },
  ]

  const actionButton = (contact: Contact, fullWidth = false) => (
    <button
      disabled={!!busy}
      onClick={() => run(contact, contact.email ? 'verify' : 'find')}
      className={`${fullWidth ? 'w-full' : ''} whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-50 ${contact.email ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}
    >
      {busy === String(contact.id) ? 'Searching…' : contact.email ? 'Verify · 1 credit' : fullWidth ? 'Find email · 1 credit' : 'Find · 1 credit'}
    </button>
  )

  return (
    <section className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Find and verify work emails</h2>
            <p className="mt-1 text-sm text-slate-500">Turn saved contacts into outreach-ready conversations.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-blue-200/70 bg-white/80 px-4 py-2.5 sm:mt-0 sm:max-w-xs">
          <p className="text-xs font-bold text-blue-700">Pay only for a returned result</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">No email found or the search fails? No credit is used.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {filters.map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-2 py-3 text-center shadow-sm transition hover:border-blue-200 sm:flex-row sm:justify-between sm:px-5 sm:py-4 sm:text-left ${filter === item.key ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200/80'}`}
          >
            <span className="min-h-8 text-[10px] font-semibold leading-4 text-slate-500 sm:min-h-0 sm:text-xs">{item.label}</span>
            <span className={`rounded-xl px-2.5 py-1 text-lg font-bold sm:px-3 sm:py-1.5 sm:text-xl ${item.color}`}>{item.value}</span>
          </button>
        ))}
      </div>

      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Contact directory</h3>
            <p className="mt-1 text-xs text-slate-400">{visible.length} {visible.length === 1 ? 'contact' : 'contacts'} in this view</p>
          </div>
          <div className="relative w-full sm:w-80">
            <svg aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg>
            <input aria-label="Search email contacts" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50" placeholder="Search name, company or email" value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">
          {visible.map(contact => (
            <article key={contact.id} className="p-4">
              <ContactIdentity contact={contact} onSelect={onSelect} />
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Company</p><p className="mt-1 truncate text-xs font-medium text-slate-700">{contact.company || 'Not added'}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p><div className="mt-1"><EmailStatusBadge contact={contact} /></div></div>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Work email</p><p className="mt-1 break-all text-xs text-slate-700">{contact.email || <span className="text-slate-400">Ready to find</span>}</p></div>
              </div>
              <div className="mt-3">{actionButton(contact, true)}</div>
            </article>
          ))}
        </div>

        <div className="hidden lg:block">
          <table className="w-full table-fixed text-sm">
            <colgroup><col className="w-[30%]"/><col className="w-[17%]"/><col className="w-[22%]"/><col className="w-[14%]"/><col className="w-[17%]"/></colgroup>
            <thead className="bg-slate-50/80 text-left"><tr>{['Contact', 'Company', 'Work email', 'Status', ''].map((heading, index) => <th key={index} scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{heading || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(contact => (
                <tr key={contact.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="min-w-0 px-4 py-4"><ContactIdentity contact={contact} onSelect={onSelect} /></td>
                  <td className="px-4 py-4"><p title={contact.company || undefined} className="truncate text-xs font-medium text-slate-600">{contact.company || 'Not added'}</p></td>
                  <td className="px-4 py-4"><p title={contact.email || undefined} className="truncate text-xs text-slate-600">{contact.email || <span className="text-slate-400">Ready to find</span>}</p></td>
                  <td className="px-4 py-4"><EmailStatusBadge contact={contact}/></td>
                  <td className="px-4 py-4 text-right">{actionButton(contact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!visible.length && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-500" aria-hidden="true">⌕</div>
            <h3 className="text-sm font-bold text-slate-800">{!contacts.length ? 'Your next connection starts here' : 'No contacts in this view'}</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400">{!contacts.length ? 'Add contacts to your CRM or capture a profile with the Hirely extension. Then find their work emails here.' : 'Try a different search or return to all contacts.'}</p>
            {!!contacts.length && <button onClick={() => { setQuery(''); setFilter('all') }} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">Show all contacts</button>}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-5 text-slate-500">
        <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>
        <p>Finding an email costs 1 credit only when an address is returned. A completed verification costs 1 credit. Failed requests use no credits. Review the status before outreach.</p>
      </div>
    </section>
  )
}
