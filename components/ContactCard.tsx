'use client'

import { Contact } from '@/types'

interface ContactCardProps {
  contact: Contact
  isSelected: boolean
  onClick: () => void
}

const statusStyles: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  'due-today': 'bg-red-50 text-red-700 border border-red-200',
  upcoming: 'bg-amber-50 text-amber-800 border border-amber-200',
  replied: 'bg-green-50 text-green-700 border border-green-200',
  'meeting-set': 'bg-green-50 text-green-700 border border-green-200',
  'no-response': 'bg-gray-100 text-gray-500 border border-gray-200',
}

export default function ContactCard({ contact, isSelected, onClick }: ContactCardProps) {
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const preview = contact.originalEmail.slice(0, 60) + '...'

  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-shrink-0"
          style={{ background: contact.avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate">{contact.firstName} {contact.lastName}</p>
          <p className="text-[10px] text-gray-400 truncate">{contact.jobTitle} - {contact.company}</p>
        </div>
      </div>

      {contact.originalEmail && (
        <p className="text-[10px] text-gray-400 border-l-2 border-gray-200 pl-1.5 mb-1.5 truncate">
          {preview}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusStyles[contact.status]}`}>
          {contact.statusLabel}
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {contact.sentDate}
        </span>
      </div>
    </div>
  )
}
