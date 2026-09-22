'use client'

import { useMemo, useState } from 'react'
import ContactPhoto from './ContactPhoto'
import EmailStatusBadge from './EmailStatusBadge'
import { followUpDay } from '@/lib/follow-up'
import { Contact, PipelineColumn } from '@/types'

interface ContactListViewProps {
  contacts: Contact[]
  selectedId?: string
  onSelect: (contact: Contact) => void
  onDelete: (id: string) => void
  onMove?: (id: string, target: PipelineColumn) => void | Promise<boolean>
  onFindEmail?: (contact: Contact) => Promise<boolean>
  emptyMessage: string
}

type SavedView = 'all' | 'missing-email' | 'due' | 'stale' | 'replied' | 'meetings'
type SortMode = 'newest' | 'name' | 'company' | 'follow-up'

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  overdue:       { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  'due-today':   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  upcoming:      { bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-400' },
  replied:       { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  'meeting-set': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  'no-response': { bg: 'bg-slate-100', text: 'text-slate-500',  dot: 'bg-slate-400' },
}

function daysSince(date?: string) {
  if (!date) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

export default function ContactListView({ contacts, selectedId, onSelect, onDelete, onMove, onFindEmail, emptyMessage }: ContactListViewProps) {
  const [view, setView] = useState<SavedView>('all')
  const [company, setCompany] = useState('all')
  const [emailStatus, setEmailStatus] = useState('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [finding, setFinding] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const companies = useMemo(() => Array.from(new Set(contacts.map(c => c.company?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)), [contacts])

  const visible = useMemo(() => {
    const filtered = contacts.filter(contact => {
      if (company !== 'all' && contact.company !== company) return false
      if (emailStatus === 'valid' && contact.emailStatus !== 'valid') return false
      if (emailStatus === 'predicted' && contact.emailStatus !== 'predicted') return false
      if (emailStatus === 'review' && (!contact.email || contact.emailStatus === 'valid')) return false
      if (view === 'missing-email' && contact.email) return false
      if (view === 'due' && contact.column !== 'today') return false
      if (view === 'stale' && (contact.column !== 'upcoming' || followUpDay(contact) || daysSince(contact.createdAt) < 7)) return false
      if (view === 'replied' && !['replied', 'meeting-set'].includes(contact.status)) return false
      if (view === 'meetings' && contact.status !== 'meeting-set') return false
      return true
    })
    return filtered.sort((a, b) => {
      if (sort === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      if (sort === 'company') return (a.company || '').localeCompare(b.company || '')
      if (sort === 'follow-up') return (followUpDay(a) || '9999-12-31').localeCompare(followUpDay(b) || '9999-12-31')
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })
  }, [contacts, company, emailStatus, sort, view])

  const selectedContacts = contacts.filter(contact => selected.has(contact.id))
  const selectableVisible = visible.map(contact => contact.id)
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every(id => selected.has(id))

  function toggleOne(id: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleVisible() {
    setSelected(current => {
      const next = new Set(current)
      if (allVisibleSelected) selectableVisible.forEach(id => next.delete(id))
      else selectableVisible.forEach(id => next.add(id))
      return next
    })
  }

  async function findEmail(contact: Contact) {
    if (!onFindEmail || finding) return
    setFinding(contact.id)
    try { await onFindEmail(contact) } finally { setFinding(null) }
  }

  async function findSelectedEmails() {
    if (!onFindEmail || bulkBusy) return
    const missing = selectedContacts.filter(contact => !contact.email)
    if (!missing.length) return
    if (!window.confirm(`Find work emails for ${missing.length} selected contact${missing.length === 1 ? '' : 's'}? Each search uses 1 email credit.`)) return
    setBulkBusy(true)
    try {
      for (const contact of missing) await onFindEmail(contact)
    } finally { setBulkBusy(false) }
  }

  async function markSelectedDone() {
    if (!onMove || bulkBusy) return
    const active = selectedContacts.filter(contact => contact.column !== 'done')
    setBulkBusy(true)
    try {
      for (const contact of active) await onMove(contact.id,'done')
      setSelected(new Set())
    } finally { setBulkBusy(false) }
  }

  function clearFilters() {
    setView('all'); setCompany('all'); setEmailStatus('all'); setSort('newest')
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
          <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <p className="text-sm text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    )
  }

  const views: { id: SavedView; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: contacts.length },
    { id: 'missing-email', label: 'Needs email', count: contacts.filter(c => !c.email).length },
    { id: 'due', label: 'Due today', count: contacts.filter(c => c.column === 'today').length },
    { id: 'stale', label: 'Stale 7+ days', count: contacts.filter(c => c.column === 'upcoming' && !followUpDay(c) && daysSince(c.createdAt) >= 7).length },
    { id: 'replied', label: 'Replied', count: contacts.filter(c => ['replied', 'meeting-set'].includes(c.status)).length },
    { id: 'meetings', label: 'Meetings', count: contacts.filter(c => c.status === 'meeting-set').length },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5" aria-label="Saved contact views">
          {views.map(item => <button key={item.id} onClick={() => setView(item.id)} aria-pressed={view === item.id} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-semibold transition ${view === item.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{item.label}<span className={`ml-1.5 ${view === item.id ? 'text-slate-300' : 'text-slate-400'}`}>{item.count}</span></button>)}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select aria-label="Filter by company" value={company} onChange={e => setCompany(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-400 sm:w-auto sm:min-w-44">
            <option value="all">All companies</option>{companies.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select aria-label="Filter by email status" value={emailStatus} onChange={e => setEmailStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-400 sm:w-auto">
            <option value="all">Any email status</option><option value="valid">Mailbox verified</option><option value="predicted">Predicted</option><option value="review">Needs review</option>
          </select>
          <select aria-label="Sort contacts" value={sort} onChange={e => setSort(e.target.value as SortMode)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-400 sm:w-auto">
            <option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="company">Company A–Z</option><option value="follow-up">Next follow-up</option>
          </select>
          {(view !== 'all' || company !== 'all' || emailStatus !== 'all' || sort !== 'newest') && <button onClick={clearFilters} className="px-2 py-2 text-xs font-semibold text-blue-600 hover:underline">Clear</button>}
          <span className="text-[11px] text-slate-400 sm:ml-auto">{visible.length} shown</span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <span className="text-xs font-bold text-blue-800">{selected.size} selected</span>
          <button disabled={bulkBusy || !selectedContacts.some(c => !c.email)} onClick={findSelectedEmails} className="rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40">{bulkBusy ? 'Working…' : 'Find emails'}</button>
          <button disabled={bulkBusy || !selectedContacts.some(c => c.column !== 'done')} onClick={markSelectedDone} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40">Mark done</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-semibold text-blue-700 hover:underline">Clear selection</button>
        </div>
      )}

      <div className="space-y-2 md:hidden" aria-label="Contacts">
        {visible.map(contact => {
          const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
          const style = statusStyles[contact.status] || { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' }
          const isOpen = selectedId === contact.id
          return <div key={contact.id} onClick={() => onSelect(contact)} className={`rounded-2xl border bg-white p-3 shadow-sm transition ${isOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100'}`}>
            <div className="flex items-start gap-3">
              <input aria-label={`Select ${contact.firstName} ${contact.lastName}`} type="checkbox" checked={selected.has(contact.id)} onChange={() => toggleOne(contact.id)} onClick={e => e.stopPropagation()} className="mt-2 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-blue-600" />
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl text-[11px] font-bold text-white shadow-sm" style={{background:contact.avatarColor}}><ContactPhoto url={contact.photoUrl} initials={initials} name={`${contact.firstName} ${contact.lastName}`}/></div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{contact.firstName} {contact.lastName}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{contact.jobTitle || contact.company || 'No title added'}</p></div><details className="relative flex-shrink-0" onClick={e=>e.stopPropagation()}><summary aria-label="Contact actions" className="list-none cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div className="absolute right-0 top-full z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{onMove&&contact.column!=='today'&&<button onClick={()=>onMove(contact.id,'today')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50">Move to Follow up today</button>}{onMove&&contact.column!=='upcoming'&&<button onClick={()=>onMove(contact.id,'upcoming')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50">Move to Coming up</button>}{onMove&&contact.column!=='done'&&<button onClick={()=>onMove(contact.id,'done')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Move to Done</button>}<div className="my-1 border-t border-slate-100"/><button onClick={()=>onDelete(contact.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">Move to Trash</button></div></details></div>
                <p className="mt-2 truncate text-[11px] font-medium text-slate-600">{contact.company || 'No company added'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">{contact.email?<p className="max-w-full truncate text-[11px] text-slate-500">{contact.email}</p>:<button disabled={!onFindEmail||!!finding} onClick={e=>{e.stopPropagation();findEmail(contact)}} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-blue-700 disabled:opacity-50">{finding===contact.id?'Searching…':'Find email · 1 credit'}</button>}<button type="button" onClick={e=>{e.stopPropagation();if(contact.column==='done')onMove?.(contact.id,'today');else onMove?.(contact.id,'done')}} className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${style.bg} ${style.text}`}>{contact.column==='done'?'Reopen':'Move to Done'}</button></div>
              </div>
            </div>
          </div>
        })}
        {!visible.length && <div className="rounded-2xl border border-slate-100 bg-white py-14 text-center"><p className="text-sm font-semibold text-slate-700">No contacts match this view</p><button onClick={clearFilters} className="mt-2 text-xs font-semibold text-blue-600">Clear filters</button></div>}
      </div>

      <div className="hidden bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm md:block">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[32px_2.3fr_1.4fr_1.8fr_1fr_32px_32px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50 items-center">
            <input aria-label="Select all visible contacts" type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span><span /><span />
          </div>

          <div className="divide-y divide-slate-50">
            {visible.map(contact => {
              const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
              const style = statusStyles[contact.status] || { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' }
              const isOpen = selectedId === contact.id
              const statusLabel = contact.statusLabel === 'No follow-up scheduled' ? 'Not scheduled' : contact.statusLabel || 'New'
              return (
                <div key={contact.id} onClick={() => onSelect(contact)} className={`relative grid grid-cols-[32px_2.3fr_1.4fr_1.8fr_1fr_32px_32px] gap-4 px-5 py-3.5 items-center cursor-pointer transition-all group ${isOpen ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}>
                  <input aria-label={`Select ${contact.firstName} ${contact.lastName}`} type="checkbox" checked={selected.has(contact.id)} onChange={() => toggleOne(contact.id)} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  <div className="flex items-center gap-3 min-w-0"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm overflow-hidden" style={{ background: contact.avatarColor }}><ContactPhoto url={contact.photoUrl} initials={initials} name={`${contact.firstName} ${contact.lastName}`} /></div><div className="min-w-0"><p className="text-[12.5px] font-semibold text-slate-900 truncate leading-tight">{contact.firstName} {contact.lastName}</p><p className="text-[10.5px] text-slate-400 truncate leading-tight mt-0.5">{contact.jobTitle || '-'}</p></div><EmailStatusBadge contact={contact} /></div>
                  <p className="text-[12px] text-slate-600 truncate font-medium">{contact.company || '-'}</p>
                  {contact.email ? <div className="flex items-center gap-1.5 min-w-0"><svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><p className="text-[11.5px] text-slate-600 truncate">{contact.email}</p></div> : <button disabled={!onFindEmail || !!finding} onClick={e => { e.stopPropagation(); findEmail(contact) }} className="w-fit rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{finding === contact.id ? 'Searching…' : 'Find email · 1 credit'}</button>}
                  {onMove ? <details className="relative w-fit" onClick={e=>e.stopPropagation()}><summary aria-label={`Change stage from ${statusLabel}`} title="Change pipeline stage" className={`list-none cursor-pointer inline-flex min-h-8 items-center gap-1.5 px-2 py-1 rounded-full text-[9.5px] font-bold w-fit hover:ring-2 hover:ring-blue-100 [&::-webkit-details-marker]:hidden ${style.bg} ${style.text}`}><div className={`w-1.5 h-1.5 rounded-full ${style.dot}`}/>{statusLabel}<svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"/></svg></summary><div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{contact.column!=='today'&&<button onClick={()=>onMove(contact.id,'today')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-700 hover:bg-red-50">Move to Follow up today</button>}{contact.column!=='upcoming'&&<button onClick={()=>onMove(contact.id,'upcoming')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50">Move to Coming up</button>}{contact.column!=='done'&&<button onClick={()=>onMove(contact.id,'done')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Move to Done</button>}</div></details> : <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9.5px] font-bold w-fit ${style.bg} ${style.text}`}><div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />{statusLabel}</div>}
                  {onMove && contact.column !== 'done' ? <button onClick={e => { e.stopPropagation(); onMove(contact.id,'done') }} className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-6 h-6 rounded-full bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-500 flex items-center justify-center group/done" title="Move to Done"><svg className="w-3 h-3 text-emerald-400 group-hover/done:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button> : <span />}
                  <details className="relative" onClick={e => e.stopPropagation()}><summary aria-label="Contact actions" title="Contact actions" className="list-none cursor-pointer w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center [&::-webkit-details-marker]:hidden"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{onMove && contact.column!=='today' && <button onClick={() => onMove(contact.id,'today')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-700 hover:bg-red-50">Move to Follow up today</button>}{onMove && contact.column!=='upcoming' && <button onClick={() => onMove(contact.id,'upcoming')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50">Move to Coming up</button>}{onMove && contact.column!=='done' && <button onClick={() => onMove(contact.id,'done')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Move to Done</button>}<div className="my-1 border-t border-slate-100"/><button onClick={() => onDelete(contact.id)} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-600 hover:bg-red-50">Move to Trash</button></div></details>
                </div>
              )
            })}
            {!visible.length && <div className="py-16 text-center"><p className="text-sm font-semibold text-slate-700">No contacts match this view</p><button onClick={clearFilters} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Clear filters</button></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
