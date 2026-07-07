'use client'

import { Contact } from '@/types'

interface ContactListViewProps {
  contacts: Contact[]
  selectedId?: string
  onSelect: (contact: Contact) => void
  onDelete: (id: string) => void
  emptyMessage: string
}

const statusStyles: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700',
  'due-today': 'bg-amber-50 text-amber-700',
  upcoming: 'bg-amber-50 text-amber-800',
  replied: 'bg-green-50 text-green-700',
  'meeting-set': 'bg-green-50 text-green-700',
  'no-response': 'bg-slate-100 text-slate-500',
}

export default function ContactListView({ contacts, selectedId, onSelect, onDelete, emptyMessage }: ContactListViewProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Name</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Company</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Email</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Status</span>
        <span></span>
      </div>
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
        {contacts.map(contact => {
          const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
          return (
            <div
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-slate-50 cursor-pointer transition-colors group ${
                selectedId === contact.id ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: contact.avatarColor }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-900 truncate">{contact.firstName} {contact.lastName}</p>
                  <p className="text-[10.5px] text-slate-400 truncate">{contact.jobTitle || '—'}</p>
                </div>
              </div>
              <p className="text-[12px] text-slate-600 truncate">{contact.company || '—'}</p>
              <p className="text-[12px] text-slate-600 truncate">{contact.email || '—'}</p>
              <span className={`text-[9.5px] px-2 py-1 rounded-full font-semibold w-fit ${statusStyles[contact.status] || 'bg-slate-100 text-slate-500'}`}>
                {contact.statusLabel}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(contact.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1"
                title="Delete contact"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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
