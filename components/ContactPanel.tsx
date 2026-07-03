'use client'

import { useState, useEffect } from 'react'
import { Contact, AIDraft } from '@/types'
import { getAIDrafts } from '@/lib/data'

interface ContactPanelProps {
  contact: Contact | null
  onClose: () => void
  onSendDraft: (draft: AIDraft, contact: Contact) => void
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<boolean>
}

type Tab = 'info' | 'drafts' | 'activity' | 'notes'

export default function ContactPanel({ contact, onClose, onSendDraft, onUpdateContact }: ContactPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [sentDrafts, setSentDrafts] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [findingEmail, setFindingEmail] = useState(false)
  const [findEmailError, setFindEmailError] = useState<string | null>(null)

  useEffect(() => {
    setFindEmailError(null)
    setFindingEmail(false)
  }, [contact?.id])

  if (!contact) {
    return (
      <div className="w-68 min-w-[272px] border-l border-slate-100 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Contact details</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[160px]">Select a contact to view their profile and AI-written follow-up drafts</p>
        </div>
      </div>
    )
  }

  const drafts = getAIDrafts(contact)
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`

  const handleSend = (draft: AIDraft) => {
    const next = new Set(Array.from(sentDrafts))
    next.add(draft.id)
    setSentDrafts(next)
    onSendDraft(draft, contact)
    setTimeout(() => {
      setSentDrafts(prev => {
        const n = new Set(Array.from(prev))
        n.delete(draft.id)
        return n
      })
    }, 3000)
  }

  const handleFindEmail = async () => {
    if (!contact.firstName || !contact.company) {
      setFindEmailError('Need a company name to search')
      return
    }
    setFindingEmail(true)
    setFindEmailError(null)
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
        await onUpdateContact(contact.id, updates)
      } else {
        setFindEmailError('No email found for this contact')
      }
    } catch (e) {
      console.error('Find email failed', e)
      setFindEmailError('Something went wrong — try again')
    } finally {
      setFindingEmail(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'drafts', label: 'AI drafts' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="w-68 min-w-[272px] border-l border-slate-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900 truncate tracking-tight">{contact.firstName} {contact.lastName}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Profile */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 tracking-wide"
            style={{ background: contact.avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 tracking-tight">{contact.firstName} {contact.lastName}</p>
            <p className="text-[11px] text-slate-400 truncate">{contact.jobTitle} - {contact.company}</p>
            {contact.enriched && (
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full mt-1 font-semibold">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Contact data enriched automatically
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2.5 flex-shrink-0">
        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-[10.5px] rounded-md transition-all font-medium ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">

        {activeTab === 'info' && (
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contact info</p>
            <div className="space-y-2 mb-4">
              {[
                { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', value: contact.email },
                { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', value: contact.phone },
                { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', value: contact.company },
                { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', value: contact.linkedinUrl, isLink: true },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={row.icon} />
                  </svg>
                  {row.isLink ? (
                    <a href="#" className="text-[11px] text-blue-600 truncate hover:underline">{row.value}</a>
                  ) : (
                    <span className="text-[11px] text-slate-600 truncate">{row.value}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-4">
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              First email: {contact.sentDate}
            </div>
            {findEmailError && (
              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2">{findEmailError}</p>
            )}
            <div className="flex gap-2">
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
              ) : (
                <button
                  onClick={handleFindEmail}
                  disabled={findingEmail}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {findingEmail ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  )}
                  {findingEmail ? 'Searching...' : 'Find email'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('drafts')}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-white rounded-lg text-xs font-medium transition-all"
                style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 6px rgba(37,99,235,.25)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI drafts
              </button>
            </div>
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full tracking-wide">
                    {draft.label}
                  </span>
                  <span className="text-[9px] text-slate-400 italic">AI generated</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{draft.body}</p>
                <div className="flex gap-1.5 mt-2.5">
                  <button className="px-2.5 py-1.5 text-[10px] border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors font-medium">Edit</button>
                  <button className="px-2.5 py-1.5 text-[10px] border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors font-medium">Copy</button>
                  <button
                    onClick={() => handleSend(draft)}
                    className={`px-2.5 py-1.5 text-[10px] rounded-lg font-medium transition-all ${
                      sentDrafts.has(draft.id)
                        ? 'text-white'
                        : 'text-white'
                    }`}
                    style={{
                      background: sentDrafts.has(draft.id)
                        ? 'linear-gradient(135deg,#10B981,#059669)'
                        : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                      boxShadow: '0 1px 4px rgba(37,99,235,.2)'
                    }}
                  >
                    {sentDrafts.has(draft.id) ? 'Sent!' : 'Send now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            {contact.activity.map((item, i) => (
              <div key={i} className="flex gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <textarea
              value={notes || contact.notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Add notes about ${contact.firstName}...`}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-[11px] text-slate-700 bg-slate-50 resize-none min-h-[110px] focus:outline-none focus:border-blue-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)] leading-relaxed font-sans transition-all"
            />
            <button className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
