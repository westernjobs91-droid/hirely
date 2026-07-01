'use client'

import { useState } from 'react'
import { Contact, PipelineColumn } from '@/types'
import { avatarColors } from '@/lib/data'

interface AddContactModalProps {
  onClose: () => void
  onAdd: (contact: Contact) => void
}

export default function AddContactModal({ onClose, onAdd }: AddContactModalProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    linkedinUrl: '',
    originalEmail: '',
    schedule: '2w1m'
  })

  const handleSubmit = () => {
    if (!form.firstName) return
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
    const newContact: Contact = {
      id: Date.now().toString(),
      firstName: form.firstName,
      lastName: form.lastName || '',
      email: form.email || 'Enriching via Hunter.io...',
      phone: 'Finding...',
      company: form.company || 'Company',
      jobTitle: form.jobTitle || 'HR Manager',
      linkedinUrl: form.linkedinUrl || 'Searching...',
      avatarColor: color,
      status: 'due-today',
      column: 'today' as PipelineColumn,
      statusLabel: 'Due in 2 weeks',
      sentDate: 'Just now',
      originalEmail: form.originalEmail,
      enriched: false,
      activity: ['Contact added just now', 'Hunter.io enrichment started', 'AI follow-ups generated'],
      notes: ''
    }
    onAdd(newContact)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl border border-gray-100 w-[480px] max-w-[96vw] max-h-[88vh] overflow-y-auto flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h2 className="text-sm font-medium text-gray-900">Add new contact</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3.5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">First name</label>
              <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Sarah" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Last name</label>
              <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Kim" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Work email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sarah@rogers.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Company</label>
              <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Rogers Communications" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Job title</label>
              <input value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="HR Director" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">LinkedIn URL (optional)</label>
            <input value={form.linkedinUrl} onChange={e => setForm({...form, linkedinUrl: e.target.value})} placeholder="linkedin.com/in/sarah-kim" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Your original email (AI writes follow-ups from this)</label>
            <textarea value={form.originalEmail} onChange={e => setForm({...form, originalEmail: e.target.value})} placeholder="Hi Sarah, I wanted to reach out about placement opportunities at Rogers. We have some exceptional senior engineering candidates..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white resize-none min-h-[80px] leading-relaxed font-sans" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Follow-up schedule</label>
            <select value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-blue-400">
              <option value="2w1m">2 weeks + 1 month (recommended)</option>
              <option value="1w2w">1 week + 2 weeks</option>
              <option value="custom">Custom timing</option>
            </select>
          </div>

          <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-[11px] text-green-700 leading-relaxed">AI generates 2 personalized follow-up drafts from your email. Hunter.io auto-finds verified contact info in the background.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Save and generate AI drafts
          </button>
        </div>
      </div>
    </div>
  )
}
