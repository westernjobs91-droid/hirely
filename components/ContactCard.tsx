'use client'

import { Contact } from '@/types'

interface ContactCardProps {
  contact: Contact
  isSelected: boolean
  onClick: () => void
  onDelete?: (id: string) => void
}

const statusStyles: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700',
  'due-today': 'bg-amber-50 text-amber-700',
  upcoming: 'bg-amber-50 text-amber-800',
  replied: 'bg-green-50 text-green-700',
  'meeting-set': 'bg-green-50 text-green-700',
  'no-response': 'bg-slate-100 text-slate-500',
}

export default function ContactCard({ contact, isSelected, onClick, onDelete }: ContactCardProps) {
  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
  const preview = contact.originalEmail ? contact.originalEmail.slice(0, 62) + '...' : ''

  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 group relative ${
        isSelected
          ? 'border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md hover:-translate-y-px'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
          style={{ background: contact.avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-slate-900 truncate tracking-tight">{contact.firstName} {contact.lastName}</p>
          <p className="text-[10px] text-slate-400 truncate">{contact.jobTitle || ''}{contact.jobTitle && contact.company ? ' - ' : ''}{contact.company}</p>
        </div>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(contact.id) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0"
            title="Delete contact"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {preview && (
        <p className="text-[10px] text-slate-400 border-l-2 border-slate-200 pl-1.5 mb-1.5 truncate italic">{preview}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusStyles[contact.status] || 'bg-slate-100 text-slate-500'}`}>
          {contact.statusLabel}
        </span>
        <span className="text-[9px] text-slate-300 flex items-center gap-1 font-medium">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {contact.sentDate}
        </span>
      </div>
    </div>
  )
}
