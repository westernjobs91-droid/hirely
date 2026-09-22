'use client'
import { followUpDay } from '@/lib/follow-up'
import ContactPhoto from './ContactPhoto'

import { Contact, PipelineColumn } from '@/types'

interface ContactCardProps {
  contact: Contact
  isSelected: boolean
  onClick: () => void
  onDelete?: (id: string) => void
  onMove?: (id: string, target: PipelineColumn) => void | Promise<boolean>
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

export default function ContactCard({ contact, isSelected, onClick, onDelete, onMove }: ContactCardProps) {
  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`.toUpperCase() || '?'
  const ago = daysAgo(contact.createdAt)
  const due=followUpDay(contact)
  const urgency=contact.status==='overdue'&&contact.column!=='done'?'text-red-500 font-semibold':'text-slate-400'

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
          <ContactPhoto url={contact.photoUrl} initials={initials} name={`${contact.firstName} ${contact.lastName}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
              {contact.firstName} {contact.lastName}
            </p>
            {onDelete && (
              <details className="relative flex-shrink-0 -mt-1" onClick={e => e.stopPropagation()}>
                <summary aria-label="Contact actions" title="Contact actions" className="list-none cursor-pointer w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center [&::-webkit-details-marker]:hidden">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
                </summary>
                <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {onMove && contact.column !== 'today' && <button onClick={() => onMove(contact.id,'today')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-700 hover:bg-red-50">Move to Follow up today</button>}
                  {onMove && contact.column !== 'upcoming' && <button onClick={() => onMove(contact.id,'upcoming')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50">Move to Coming up</button>}
                  {onMove && contact.column !== 'done' && <button onClick={() => onMove(contact.id,'done')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Move to Done</button>}
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={() => onDelete(contact.id)} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-600 hover:bg-red-50">Move to Trash</button>
                </div>
              </details>
            )}
          </div>

          <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
            {contact.jobTitle || contact.company || ''}
            {contact.jobTitle && contact.company ? ` · ${contact.company}` : ''}
          </p>

          {/* Email indicator */}
          {contact.email ? (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v12H3z M3 6l9 7 9-7" />
              </svg>
              <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
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
        {onMove ? (
          <details className="relative" onClick={e => e.stopPropagation()}>
            <summary aria-label={`Change stage from ${contact.statusLabel || 'New'}`} title="Change pipeline stage" className={`list-none cursor-pointer text-[10.5px] px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 hover:ring-2 hover:ring-blue-100 [&::-webkit-details-marker]:hidden ${statusStyles[contact.status] || 'bg-slate-100 text-slate-500'}`}>
              {contact.statusLabel || 'New'}
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="absolute bottom-full left-0 z-30 mb-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {contact.column !== 'today' && <button onClick={() => onMove(contact.id,'today')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-red-700 hover:bg-red-50">Move to Follow up today</button>}
              {contact.column !== 'upcoming' && <button onClick={() => onMove(contact.id,'upcoming')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-50">Move to Coming up</button>}
              {contact.column !== 'done' && <button onClick={() => onMove(contact.id,'done')} className="w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">Move to Done</button>}
            </div>
          </details>
        ) : (
          <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ${statusStyles[contact.status] || 'bg-slate-100 text-slate-500'}`}>
            {contact.statusLabel || 'New'}
          </span>
        )}
        <div className="flex items-center gap-2">
          {onMove && contact.column !== 'done' && (
            <button
              onClick={e => { e.stopPropagation(); onMove(contact.id,'done') }}
              className="opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[9px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              title="Move to Done"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          )}
          {(due || ago) && (
            <span className={`text-[10.5px] ${urgency}`} title={due?'Follow-up date':'Days since added'}>
              {due?new Date(due+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Added '+ago}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
