'use client'

import { Contact } from '@/types'

interface ContactListViewProps {
  contacts: Contact[]
  selectedId?: string
  onSelect: (contact: Contact) => void
  onDelete: (id: string) => void
  emptyMessage: string
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  overdue:       { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  'due-today':   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  upcoming:      { bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-400' },
  replied:       { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  'meeting-set': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  'no-response': { bg: 'bg-slate-100', text: 'text-slate-500',  dot: 'bg-slate-400' },
}

export default function ContactListView({ contacts, selectedId, onSelect, onDelete, emptyMessage }: ContactListViewProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
          <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[2.5fr_1.5fr_1.8fr_1fr_32px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
        <span />
      </div>

      <div className="divide-y divide-slate-50">
        {contacts.map(contact => {
          const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
          const style = statusStyles[contact.status] || { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' }
          const isSelected = selectedId === contact.id

          return (
            <div
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`grid grid-cols-[2.5fr_1.5fr_1.8fr_1fr_32px] gap-4 px-5 py-3.5 items-center cursor-pointer transition-all group ${
                isSelected
                  ? 'bg-blue-50 border-l-2 border-l-blue-500'
                  : 'hover:bg-slate-50 border-l-2 border-l-transparent'
              }`}
            >
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
                  style={{ background: contact.avatarColor }}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-900 truncate leading-tight">{contact.firstName} {contact.lastName}</p>
                  <p className="text-[10.5px] text-slate-400 truncate leading-tight mt-0.5">{contact.jobTitle || '—'}</p>
                </div>
                {contact.enriched && (
                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0" title="Email verified">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Company */}
              <p className="text-[12px] text-slate-600 truncate font-medium">{contact.company || '—'}</p>

              {/* Email */}
              {contact.email ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[11.5px] text-slate-600 truncate">{contact.email}</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                  </svg>
                  <span className="text-[11px] text-slate-300 italic">No email</span>
                </div>
              )}

              {/* Status */}
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9.5px] font-bold w-fit ${style.bg} ${style.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {contact.statusLabel || 'New'}
              </div>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(contact.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-1 rounded-lg hover:bg-red-50"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
