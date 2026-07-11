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

function daysAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1d ago'
  if (diff < 7) return diff + 'd ago'
  if (diff < 30) return Math.floor(diff / 7) + 'w ago'
  return Math.floor(diff / 30) + 'mo ago'
}

function urgencyColor(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff >= 14) return 'text-red-500 font-bold'
  if (diff >= 7) return 'text-amber-500 font-semibold'
  return 'text-slate-400'
}

export default function ContactCard({ contact, isSelected, onClick, onDelete }: ContactCardProps) {
  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
  const ago = daysAgo(contact.createdAt)
  const urgency = urgencyColor(contact.createdAt)

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 group relative ${
        isSelected
          ? 'border-blue-400 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md hover:-translate-y-px'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
          style={{ background: contact.avatarColor }}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[12px] font-bold text-slate-900 truncate leading-tight">
              {contact.firstName} {contact.lastName}
            </p>
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(contact.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 flex-shrink-0 -mt-0.5"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <p className="text-[10.5px] text-slate-400 truncate leading-tight mt-0.5">
            {contact.jobTitle || contact.company || ''}
            {contact.jobTitle && contact.company ? ` · ${contact.company}` : ''}
          </p>

          {/* Email indicator */}
          {contact.email ? (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[10px] text-slate-400 truncate">{contact.email}</p>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-[10px] text-slate-300 italic">No email</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-50">
        <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold ${statusStyles[contact.status] || 'bg-slate-100 text-slate-500'}`}>
          {contact.statusLabel || 'New'}
        </span>
        {ago && (
          <span className={`text-[9.5px] ${urgency}`} title="Days since added">
            {ago}
          </span>
        )}
      </div>
    </div>
  )
}
