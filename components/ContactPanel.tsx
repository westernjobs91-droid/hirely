'use client'

import { useState } from 'react'
import { Contact, AIDraft } from '@/types'
import { getAIDrafts } from '@/lib/data'

interface ContactPanelProps {
  contact: Contact | null
  onClose: () => void
  onSendDraft: (draft: AIDraft, contact: Contact) => void
}

type Tab = 'info' | 'drafts' | 'activity' | 'notes'

export default function ContactPanel({ contact, onClose, onSendDraft }: ContactPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [sentDrafts, setSentDrafts] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  if (!contact) {
    return (
      <div className="w-64 min-w-[256px] border-l border-gray-100 bg-white flex flex-col">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Contact details</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-gray-400 leading-relaxed">Select a contact to view their profile, info, and AI follow-up drafts</p>
        </div>
      </div>
    )
  }

  const drafts = getAIDrafts(contact)
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`

  const handleSend = (draft: AIDraft) => {
    setSentDrafts(prev => { const next = new Set(Array.from(prev)); next.add(draft.id); return next; })
    onSendDraft(draft, contact)
    setTimeout(() => {
      setSentDrafts(prev => {
        const next = new Set(Array.from(prev))
        next.delete(draft.id)
        return next
      })
    }, 3000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'drafts', label: 'AI drafts' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="w-64 min-w-[256px] border-l border-gray-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-medium text-gray-900 truncate">{contact.firstName} {contact.lastName}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Profile */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ background: contact.avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{contact.firstName} {contact.lastName}</p>
            <p className="text-[11px] text-gray-400 truncate">{contact.jobTitle} - {contact.company}</p>
            {contact.enriched && (
              <span className="inline-flex items-center gap-1 text-[9px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full mt-1">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                LinkedIn enriched via Hunter.io
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[11px] border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div>
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-2">Contact info</p>
            <div className="space-y-2 mb-4">
              {[
                { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', value: contact.email },
                { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', value: contact.phone },
                { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', value: contact.company },
                { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', value: contact.linkedinUrl, isLink: true },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={row.icon} />
                  </svg>
                  {row.isLink ? (
                    <a href="#" className="text-[11px] text-blue-600 truncate">{row.value}</a>
                  ) : (
                    <span className="text-[11px] text-gray-600 truncate">{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mb-2">Status</p>
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                First email: {contact.sentDate}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI drafts
              </button>
            </div>
          </div>
        )}

        {/* DRAFTS TAB */}
        {activeTab === 'drafts' && (
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    {draft.label}
                  </span>
                  <span className="text-[9px] text-gray-400">AI generated</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{draft.body}</p>
                <div className="flex gap-1.5 mt-2">
                  <button className="px-2 py-1 text-[10px] border border-gray-200 rounded text-gray-600 hover:bg-white transition-colors">Edit</button>
                  <button className="px-2 py-1 text-[10px] border border-gray-200 rounded text-gray-600 hover:bg-white transition-colors">Copy</button>
                  <button
                    onClick={() => handleSend(draft)}
                    className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                      sentDrafts.has(draft.id)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {sentDrafts.has(draft.id) ? 'Sent!' : 'Send now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div>
            {contact.activity.map((item, i) => (
              <div key={i} className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            <textarea
              value={notes || contact.notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Add notes about ${contact.firstName}...`}
              className="w-full p-2 border border-gray-200 rounded-lg text-[11px] text-gray-700 bg-gray-50 resize-none min-h-[100px] focus:outline-none focus:border-blue-400 leading-relaxed font-sans"
            />
            <button className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors">
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
