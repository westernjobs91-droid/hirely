'use client'

import { useState, useEffect } from 'react'
import { Contact } from '@/types'
import { supabase } from '@/lib/supabase'

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
  const enriched = contacts.filter(c => c.email)
  const [rowState, setRowState] = useState<Record<string, RowState>>({})
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const findEmailFor = async (contact: Contact) => {
    if (!contact.company) {
      setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'Need a company name', note: null, done: false } }))
      return false
    }
    setRowState(prev => ({ ...prev, [contact.id]: { loading: true, error: null, note: null, done: false } }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, company: contact.company })
      })
      const data = await res.json()
      if (res.status === 402) {
        setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'Monthly limit reached - upgrade for more enrichments', note: null, done: false } }))
        return false
      }
      if (data.enriched && data.email) {
        const updates: Partial<Contact> = { email: data.email, enriched: true }
        if (data.phone) updates.phone = data.phone
        if (data.linkedinUrl && !contact.linkedinUrl) updates.linkedinUrl = data.linkedinUrl
        if (data.title && !contact.jobTitle) updates.jobTitle = data.title
        if (data.resolvedCompany && data.resolvedCompany !== contact.company) updates.company = data.resolvedCompany
        await onUpdateContact(contact.id, updates)
        const note = data.guessed ? `Best guess (${data.confidence || '?'}%) - confirm before sending` : null
        setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: null, note, done: true } }))
        return true
      } else {
        setRowState(prev => ({ ...prev, [contact.id]: { loading: false, error: 'No email found', note: null, done: false } }))
        return false
      }
    } catch (e) {
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
      await new Promise(r => setTimeout(r, 600))
    }
    setBulkRunning(false)
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
          <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">Add contacts first</p>
        <p className="text-xs text-slate-400">Contacts missing emails will appear here for enrichment</p>
      </div>
    )
  }

  if (needsEnrichment.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-emerald-800 mb-1">All {enriched.length} contacts have emails</p>
          <p className="text-xs text-emerald-600">New contacts missing emails will appear here automatically</p>
        </div>
      </div>
    )
  }

  const enrichedPct = contacts.length > 0 ? Math.round((enriched.length / contacts.length) * 100) : 0

  return (
    <div className="p-6 space-y-5">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-4.5 h-4.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-slate-900">{needsEnrichment.length}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Missing email</div>
          <div className="text-[10px] text-slate-400 mt-0.5">need enrichment</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-slate-900">{enriched.length}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Have email</div>
          <div className="text-[10px] text-slate-400 mt-0.5">ready to contact</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-black text-slate-900">{enrichedPct}%</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Enrichment rate</div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${enrichedPct}%` }} />
          </div>
        </div>
      </div>

      {/* Contacts table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">

        {/* Table header + bulk action */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-slate-700">
              {needsEnrichment.length} contact{needsEnrichment.length !== 1 ? 's' : ''} need an email
            </span>
          </div>
          <button
            onClick={runBulk}
            disabled={bulkRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}
          >
            {bulkRunning ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {bulkProgress.done} of {bulkProgress.total}...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Find all emails
              </>
            )}
          </button>
        </div>

        {/* Progress bar when bulk running */}
        {bulkRunning && (
          <div className="h-1 bg-slate-100">
            <div className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }} />
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[2.5fr_1.5fr_2fr_auto] gap-4 px-5 py-2.5 border-b border-slate-50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Result</span>
          <span />
        </div>

        <div className="divide-y divide-slate-50 max-h-[calc(100vh-380px)] overflow-y-auto">
          {needsEnrichment.map(contact => {
            const state = rowState[contact.id]
            const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'

            return (
              <div key={contact.id}
                className="grid grid-cols-[2.5fr_1.5fr_2fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors group">

                {/* Name */}
                <div onClick={() => onSelect(contact)} className="flex items-center gap-3 min-w-0 cursor-pointer">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
                    style={{ background: contact.avatarColor }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-[10.5px] text-slate-400 truncate">{contact.jobTitle || '-'}</p>
                  </div>
                </div>

                {/* Company */}
                <p className="text-[12px] text-slate-600 truncate font-medium">
                  {contact.company || <span className="text-slate-300 italic">Not set</span>}
                </p>

                {/* Result */}
                <div className="min-w-0">
                  {state?.loading && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span className="text-[11px] text-slate-400">Searching...</span>
                    </div>
                  )}
                  {state?.done && contact.email && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium truncate">{contact.email}</p>
                    </div>
                  )}
                  {state?.error && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 text-[9px] font-bold">!</span>
                      </div>
                      <p className="text-[11px] text-amber-600 truncate">{state.error}</p>
                    </div>
                  )}
                  {state?.note && (
                    <p className="text-[10px] text-blue-500 truncate mt-0.5">{state.note}</p>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => findEmailFor(contact)}
                  disabled={state?.loading || bulkRunning}
                  className={`px-3 py-1.5 text-[11px] rounded-xl font-semibold transition-all whitespace-nowrap disabled:opacity-50 ${
                    state?.done
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-900 hover:bg-slate-700 text-white'
                  }`}
                >
                  {state?.loading ? '...' : state?.done ? 'Found ✓' : 'Find email'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-slate-50 bg-slate-50">
          <p className="text-[10px] text-slate-400">
            Uses Apollo + Hunter credits - 1 lookup per contact. Runs sequentially to respect rate limits.
          </p>
        </div>
      </div>
    </div>
  )
}
