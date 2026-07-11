'use client'

import { useState } from 'react'
import { Contact } from '@/types'

interface AIDraftsViewProps {
  contacts: Contact[]
  onSelect: (contact: Contact) => void
}

export default function AIDraftsView({ contacts, onSelect }: AIDraftsViewProps) {
  const withDrafts = contacts.filter(c => c.aiDrafts && c.aiDrafts.length > 0)
  const withEmail = contacts.filter(c => c.email && (!c.aiDrafts || c.aiDrafts.length === 0))
  const noDraftsNoEmail = contacts.filter(c => !c.email && (!c.aiDrafts || c.aiDrafts.length === 0))
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">Add contacts to generate AI drafts</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Drafts ready', value: withDrafts.length, color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
          { label: 'Ready to generate', value: withEmail.length, color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
          { label: 'Need email first', value: noDraftsNoEmail.length, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <div className={`w-3 h-3 rounded-full ${s.dot}`} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{s.value}</div>
              <div className="text-[10px] text-slate-400 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Contacts with drafts ready */}
      {withDrafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold text-slate-900">Drafts ready</h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{withDrafts.length}</span>
          </div>
          <div className="space-y-3">
            {withDrafts.map(contact => {
              const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase()
              const isExpanded = expandedContact === contact.id
              const firstDraft = contact.aiDrafts?.[0]
              return (
                <div key={contact.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Contact row */}
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedContact(isExpanded ? null : contact.id)}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                      style={{ background: contact.avatarColor }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-900">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{contact.jobTitle}{contact.company ? ` · ${contact.company}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">
                        {contact.aiDrafts?.length} draft{contact.aiDrafts?.length !== 1 ? 's' : ''}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); onSelect(contact) }}
                        className="text-[11px] text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                        Open →
                      </button>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded drafts */}
                  {isExpanded && contact.aiDrafts && (
                    <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50">
                      {contact.aiDrafts.map((draft, idx) => (
                        <div key={draft.id} className="bg-white border border-slate-200 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              {draft.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleCopy(draft.body, `${contact.id}-${idx}`)}
                                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg font-medium transition-all ${
                                  copied === `${contact.id}-${idx}`
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied === `${contact.id}-${idx}` ? 'Copied!' : 'Copy'}
                              </button>
                              {contact.email && (
                                <a href={`mailto:${contact.email}?body=${encodeURIComponent(draft.body)}`}
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Send
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="text-[11.5px] text-slate-600 leading-relaxed line-clamp-3">{draft.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contacts ready to generate */}
      {withEmail.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Ready to generate</h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">{withEmail.length}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-50">
              {withEmail.map(contact => {
                const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase()
                return (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                      style={{ background: contact.avatarColor }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-900">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[10.5px] text-slate-400 truncate">{contact.company}</p>
                    </div>
                    <button onClick={() => onSelect(contact)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generate drafts
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Need email first */}
      {noDraftsNoEmail.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <h3 className="text-sm font-bold text-slate-500">Need email first</h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{noDraftsNoEmail.length}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm opacity-60">
            <div className="divide-y divide-slate-50">
              {noDraftsNoEmail.slice(0, 5).map(contact => {
                const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase()
                return (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                      style={{ background: contact.avatarColor }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-900">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[10.5px] text-slate-400 truncate">{contact.company}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">Find email in Enrichment →</span>
                  </div>
                )
              })}
              {noDraftsNoEmail.length > 5 && (
                <div className="px-4 py-2 text-center text-[10.5px] text-slate-400">
                  +{noDraftsNoEmail.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
