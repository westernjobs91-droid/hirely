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
    firstName: '', lastName: '', email: '', company: '',
    jobTitle: '', linkedinUrl: '', originalEmail: '', schedule: '2w1m'
  })

  const handleSubmit = () => {
    if (!form.firstName) return
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
    onAdd({
      id: Date.now().toString(),
      firstName: form.firstName, lastName: form.lastName || '',
      email: form.email || 'Enriching via Hunter.io...',
      phone: 'Finding...', company: form.company || 'Company',
      jobTitle: form.jobTitle || 'HR Manager',
      linkedinUrl: form.linkedinUrl || 'Searching...',
      avatarColor: color, status: 'due-today', column: 'today' as PipelineColumn,
      statusLabel: 'Due in 2 weeks', sentDate: 'Just now',
      originalEmail: form.originalEmail, enriched: false,
      activity: ['Contact added just now', 'Hunter.io enrichment started', 'AI follow-ups generated'],
      notes: ''
    })
    onClose()
  }

  const inp = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50 focus:outline-none focus:border-blue-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)] transition-all font-sans"
  const lbl = "block text-[11px] font-semibold text-slate-500 mb-1 tracking-wide"

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl border border-slate-200 w-[490px] max-w-[96vw] max-h-[90vh] overflow-y-auto flex flex-col" style={{ boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Add new contact</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>First name</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Sarah" className={inp} /></div>
            <div><label className={lbl}>Last name</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Kim" className={inp} /></div>
          </div>
          <div><label className={lbl}>Work email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sarah@rogers.com" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Company</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Rogers Communications" className={inp} /></div>
            <div><label className={lbl}>Job title</label><input value={form.jobTitle} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="HR Director" className={inp} /></div>
          </div>
          <div><label className={lbl}>LinkedIn URL (optional)</label><input value={form.linkedinUrl} onChange={e => setForm({...form, linkedinUrl: e.target.value})} placeholder="linkedin.com/in/sarah-kim" className={inp} /></div>
          <div>
            <label className={lbl}>Your original email (AI writes follow-ups from this)</label>
            <textarea value={form.originalEmail} onChange={e => setForm({...form, originalEmail: e.target.value})} placeholder="Hi Sarah, I wanted to reach out about placement opportunities at Rogers..." className={`${inp} resize-none min-h-[80px] leading-relaxed`} />
          </div>
          <div>
            <label className={lbl}>Follow-up schedule</label>
            <select value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} className={inp}>
              <option value="2w1m">2 weeks + 1 month (recommended)</option>
              <option value="1w2w">1 week + 2 weeks</option>
              <option value="custom">Custom timing</option>
            </select>
          </div>
          <div className="flex items-start gap-3 rounded-xl px-3 py-3 border border-emerald-200" style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)' }}>
            <svg className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-[11px] text-emerald-700 leading-relaxed">AI generates 2 personalized follow-up drafts from your email. Hunter.io auto-finds verified contact info in the background.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,.25)' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            Save and generate AI drafts
          </button>
        </div>
      </div>
    </div>
  )
}
