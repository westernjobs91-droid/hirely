'use client'

import { useState } from 'react'
import { Contact } from '@/types'

interface EnrichmentViewProps {
  contacts: Contact[]
  onSelect: (contact: Contact) => void
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<boolean>
}

interface RowState {
  loading: boolean
  error: string | null
  note: string | null
  done: boolean
}

export default function EnrichmentView({ contacts, onSelect, onUpdateContact }: EnrichmentViewProps) {
  const needsEnrichment = contacts.filter(c => !c.email)
  const [rowState, setRowState] = useState<Record<string, RowState>>({})
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  const findEmailFor = async (contact: Contact) => {
    if (!contact.company) {
      setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'Need a company name to search', note: null, done: false } }))
      return false
    }
    setRowState(prev => ({ ...prev, [contact.id]: { loading: true, error: null, note: null, done: false } }))
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName,
          company: contact.company
        })
      })
      const data = await res.json()

      if (data.enriched && data.email) {
        const updates: Partial<Contact> = { email: data.email, enriched: true }
        if (data.phone) updates.phone = data.phone
        if (data.linkedinUrl && !contact.linkedinUrl) updates.linkedinUrl = data.linkedinUrl
        if (data.title && !contact.jobTitle) updates.jobTitle = data.title
        if (data.resolvedCompany && data.resolvedCompany !== contact.company) updates.company = data.resolvedCompany
        await onUpdateContact(contact.id, updates)
        const note = data.guessed
          ? `Best guess based on company format${typeof data.confidence === 'number' ? ` (${data.confidence}%)` : ''} — worth confirming.`
          : null
        setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: null, note, done: true } }))
        return true
      } else {
        setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'No email found', note: null, done: false } }))
        return false
      }
    } catch (e) {
      console.error('Bulk find email failed', e)
      setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'Something went wrong', note: null, done: false } }))
      return false
    }
  }

  const runBulk = async () => {
    setBulkRunning(true)
    setBulkProgress({ done: 0, total: needsEnrichment.length })
    for (let i = 0; i < needsEnrichment.length; i++) {
      await findEmailFor(needsEnrichment[i])
      setBulkProgress({ done: i + 1, total: needsEnrichment.length })
      // Small pause between calls to be gentle on Apollo/Hunter rate limits
      await new Promise(r => setTimeout(r, 600))
    }
    setBulkRunning(false)
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-slate-400">Add some contacts first.</p>
      </div>
    )
  }

  if (needsEnrichment.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600 mb-1">Everyone already has an email on file. Nice.</p>
          <p className="text-xs text-slate-400">New contacts missing an email will show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">{needsEnrichment.length} contact{needsEnrichment.length !== 1 ? 's' : ''} missing an email</p>
        <button
          onClick={runBulk}
          disabled={bulkRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,.25)' }}
        >
          {bulkRunning ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Enriching {bulkProgress.done} of {bulkProgress.total}...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Find email for all
            </>
          )}
        </button>
      </div>

      <p className="text-[10.5px] text-slate-400 mb-3">
        This uses your Apollo/Hunter credits — one lookup per contact below. Runs one at a time, not all at once.
      </p>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
        <div className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Name</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Result</span>
          <span></span>
        </div>
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          {needsEnrichment.map(contact => {
            const state = rowState[contact.id]
            const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
            return (
              <div key={contact.id} className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <div onClick={() => onSelect(contact)} className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: contact.avatarColor }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-900 truncate">{contact.firstName} {contact.lastName}</p>
                    <p className="text-[10.5px] text-slate-400 truncate">{contact.jobTitle || '—'}</p>
                  </div>
                </div>
                <p className="text-[12px] text-slate-600 truncate">{contact.company || <span className="italic text-slate-300">Not set</span>}</p>
                <div className="min-w-0">
                  {state?.done && contact.email && <p className="text-[11px] text-emerald-600 font-medium truncate">✓ {contact.email}</p>}
                  {state?.error && <p className="text-[10.5px] text-amber-600 truncate">{state.error}</p>}
                  {state?.note && <p className="text-[10px] text-blue-600 truncate">{state.note}</p>}
                </div>
                <button
                  onClick={() => findEmailFor(contact)}
                  disabled={state?.loading || bulkRunning}
                  className="px-2.5 py-1.5 text-[10.5px] border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {state?.loading ? 'Searching...' : 'Find email'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
