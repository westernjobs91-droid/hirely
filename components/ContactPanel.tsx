'use client'

import { useState, useEffect } from 'react'
import { Contact, AIDraft } from '@/types'

interface ContactPanelProps {
  contact: Contact | null
  onClose: () => void
  onSendDraft: (draft: AIDraft, contact: Contact) => void
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<boolean>
}

type Tab = 'info' | 'drafts' | 'activity' | 'notes'

function InfoRow({ icon, label, value, href, isEmail }: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  isEmail?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-blue-600 hover:underline truncate block font-medium">{value}</a>
        ) : (
          <p className={`text-[12px] font-medium truncate ${isEmail ? 'text-slate-900' : 'text-slate-700'}`}>{value}</p>
        )}
      </div>
      {isEmail && (
        <a href={`mailto:${value}`}
          className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
          title="Send email">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>
      )}
    </div>
  )
}

export default function ContactPanel({ contact, onClose, onSendDraft, onUpdateContact }: ContactPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [sentDrafts, setSentDrafts] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [findingEmail, setFindingEmail] = useState(false)
  const [findEmailError, setFindEmailError] = useState<string | null>(null)
  const [findEmailNote, setFindEmailNote] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', phone: '', company: '', jobTitle: '', linkedinUrl: '' })
  const [saving, setSaving] = useState(false)
  const [generatingDrafts, setGeneratingDrafts] = useState(false)
  const [draftsError, setDraftsError] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [followUpSaved, setFollowUpSaved] = useState(false)

  useEffect(() => {
    setFindEmailError(null)
    setFindEmailNote(null)
    setFindingEmail(false)
    setEditing(false)
    setSaving(false)
    setDraftsError(null)
    setNotes(contact?.notes || '')
    setFollowUpDate(contact?.sentDate || '')
    setFollowUpSaved(false)
  }, [contact?.id])

  if (!contact) {
    return (
      <div className="w-80 min-w-[320px] border-l border-slate-100 bg-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">No contact selected</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Click any contact in your pipeline to view their details and AI follow-up drafts</p>
          </div>
        </div>
      </div>
    )
  }

  const drafts = contact.aiDrafts || []
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase()

  const handleSend = (draft: AIDraft) => {
    const next = new Set(Array.from(sentDrafts))
    next.add(draft.id)
    setSentDrafts(next)
    onSendDraft(draft, contact)
    setTimeout(() => {
      setSentDrafts(prev => { const n = new Set(Array.from(prev)); n.delete(draft.id); return n })
    }, 3000)
  }

  const startEditing = () => {
    setEditForm({ email: contact.email || '', phone: contact.phone || '', company: contact.company || '', jobTitle: contact.jobTitle || '', linkedinUrl: contact.linkedinUrl || '' })
    setEditing(true)
  }

  const saveEditing = async () => {
    setSaving(true)
    const ok = await onUpdateContact(contact.id, {
      email: editForm.email.trim(), phone: editForm.phone.trim(),
      company: editForm.company.trim(), jobTitle: editForm.jobTitle.trim(), linkedinUrl: editForm.linkedinUrl.trim()
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  const handleGenerateDrafts = async () => {
    setGeneratingDrafts(true)
    setDraftsError(null)
    try {
      const { supabase: sb } = await import('@/lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/generate-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, company: contact.company, jobTitle: contact.jobTitle, originalEmail: contact.originalEmail })
      })
      const data = await res.json()
      if (data.drafts) {
        await onUpdateContact(contact.id, { aiDrafts: data.drafts })
      } else {
        setDraftsError(data.error || 'Could not generate drafts. Try again.')
      }
    } catch (e) {
      setDraftsError('Something went wrong. Try again.')
    } finally {
      setGeneratingDrafts(false)
    }
  }

  const handleFindEmail = async () => {
    if (!contact.firstName || !contact.company) { setFindEmailError('Need a company name to search'); return }
    setFindingEmail(true); setFindEmailError(null); setFindEmailNote(null)
    try {
      const { supabase: sb } = await import('@/lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ firstName: contact.firstName, lastName: contact.lastName, company: contact.company })
      })
      const data = await res.json()
      if (res.status === 402) {
        setFindEmailError('Monthly enrichment limit reached - upgrade your plan for more.')
        return
      }
      if (data.enriched && data.email) {
        const updates: Partial<Contact> = { email: data.email, enriched: true }
        if (data.phone) updates.phone = data.phone
        if (data.linkedinUrl && !contact.linkedinUrl) updates.linkedinUrl = data.linkedinUrl
        if (data.title && !contact.jobTitle) updates.jobTitle = data.title
        if (data.resolvedCompany && data.resolvedCompany !== contact.company) updates.company = data.resolvedCompany
        await onUpdateContact(contact.id, updates)
        if (data.guessed) {
          setFindEmailNote(`Best guess based on ${contact.company}'s email format - confirm before sending.`)
        }
      } else {
        setFindEmailError('No email found for this contact')
      }
    } catch (e) {
      setFindEmailError('Something went wrong - try again')
    } finally {
      setFindingEmail(false)
    }
  }

  const handleSaveNote = async () => {
    setSavingNote(true)
    await onUpdateContact(contact.id, { notes })
    setSavingNote(false)
  }

  const handleSaveFollowUp = async () => {
    if (!contact || !followUpDate) return
    setSavingFollowUp(true)
    // Save the date but keep in Coming up — auto-move runs on that date
    await onUpdateContact(contact.id, {
      sentDate: followUpDate,
      statusLabel: 'Follow Up Scheduled'
    })
    setSavingFollowUp(false)
    setFollowUpSaved(true)
    setTimeout(() => setFollowUpSaved(false), 2000)
  }

  const handleMoveToDone = async () => {
    if (!contact) return
    await onUpdateContact(contact.id, {
      column: 'done' as Contact['column'],
      statusLabel: 'Done'
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'drafts', label: 'AI Drafts' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="w-80 min-w-[320px] border-l border-slate-100 bg-white flex flex-col h-full overflow-hidden">

      {/* Profile header */}
      <div className="flex-shrink-0">
        {/* Colored banner — thin accent strip */}
        <div className="h-2 w-full" style={{ backgroundColor: contact.avatarColor }} />

        {/* Close button + profile content */}
        <div className="px-4 pt-4 pb-3 relative">
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white flex-shrink-0 shadow-sm"
              style={{ background: contact.avatarColor }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 truncate">{contact.firstName} {contact.lastName}</h2>
                {contact.enriched && (
                  <span title="Email verified" className="flex-shrink-0 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{contact.jobTitle}{contact.jobTitle && contact.company ? ' · ' : ''}{contact.company}</p>
            </div>
          </div>

          {/* Quick action row */}
          <div className="flex gap-2 mt-3">
            {contact.email ? (
              <a href={`mailto:${contact.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-semibold transition-colors shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send email
              </a>
            ) : (
              <button onClick={handleFindEmail} disabled={findingEmail}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-[11px] font-semibold transition-colors shadow-sm">
                {findingEmail ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                )}
                {findingEmail ? 'Searching...' : 'Find email'}
              </button>
            )}
            <button onClick={() => setActiveTab('drafts')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI drafts
            </button>
          </div>

          {/* Mark as done — always visible */}
          {contact.column !== 'done' && (
            <button
              onClick={handleMoveToDone}
              className="w-full mt-2 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
            >
              Mark as done ✓
            </button>
          )}

          {findEmailError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mt-2">{findEmailError}</p>}
          {findEmailNote && <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">{findEmailNote}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="p-4">
            {!editing ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact info</p>
                  <button onClick={startEditing} className="text-[10px] text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>

                {!contact.email && !contact.phone && !contact.company && !contact.linkedinUrl ? (
                  <div className="py-6 text-center">
                    <p className="text-xs text-slate-400 mb-2">No contact info yet</p>
                    <button onClick={startEditing} className="text-xs text-blue-600 font-semibold hover:underline">+ Add info</button>
                  </div>
                ) : (
                  <div>
                    <InfoRow
                      icon={<svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                      label="Email" value={contact.email} isEmail
                    />
                    <InfoRow
                      icon={<svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                      label="Phone" value={contact.phone}
                    />
                    <InfoRow
                      icon={<svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                      label="Company" value={contact.company}
                    />
                    <InfoRow
                      icon={<svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                      label="Job title" value={contact.jobTitle}
                    />
                    {contact.linkedinUrl && (
                      <InfoRow
                        icon={<svg className="w-3.5 h-3.5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
                        label="LinkedIn" value="View profile" href={contact.linkedinUrl}
                      />
                    )}
                  </div>
                )}

                {/* Status block */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[9px] text-slate-400 font-medium mb-1">Stage</p>
                      <p className="text-xs font-bold text-slate-700">{contact.statusLabel || 'New'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[9px] text-slate-400 font-medium mb-1">Added</p>
                      <p className="text-xs font-bold text-slate-700">{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : '-'}</p>
                    </div>
                  </div>

                  {/* Follow-up date picker */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-2">Schedule follow-up</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={followUpDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => { setFollowUpDate(e.target.value); setFollowUpSaved(false) }}
                        className="flex-1 px-2.5 py-1.5 border border-amber-200 rounded-lg text-[11px] text-slate-700 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 transition-all"
                      />
                      <button
                        onClick={handleSaveFollowUp}
                        disabled={!followUpDate || savingFollowUp}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap disabled:opacity-50 ${
                          followUpSaved
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {savingFollowUp ? '...' : followUpSaved ? 'Saved ✓' : 'Set'}
                      </button>
                    </div>
                    <p className="text-[9.5px] text-amber-600 mt-1.5">Contact auto-moves to Follow up today on this date</p>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edit contact</p>
                </div>
                {[
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
                  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 (416) 000-0000' },
                  { key: 'company', label: 'Company', type: 'text', placeholder: 'Company name' },
                  { key: 'jobTitle', label: 'Job title', type: 'text', placeholder: 'e.g. HR Manager' },
                  { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url', placeholder: 'linkedin.com/in/...' },
                ].map(field => (
                  <div key={field.key} className="mb-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">{field.label}</label>
                    <input
                      type={field.type}
                      value={editForm[field.key as keyof typeof editForm]}
                      onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setEditing(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={saveEditing} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DRAFTS TAB */}
        {activeTab === 'drafts' && (
          <div className="p-4 space-y-3">
            {draftsError && <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{draftsError}</p>}

            {drafts.length === 0 && !generatingDrafts && (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">No drafts yet</p>
                <p className="text-[11px] text-slate-400 mb-4">Generate 3 personalized follow-up emails for {contact.firstName}</p>
                <button onClick={handleGenerateDrafts}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm">
                  Generate AI drafts
                </button>
              </div>
            )}

            {generatingDrafts && (
              <div className="text-center py-10">
                <svg className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-xs text-slate-500 font-medium">Writing personalized drafts for {contact.firstName}...</p>
                <p className="text-[10px] text-slate-400 mt-1">This takes a few seconds</p>
              </div>
            )}

            {drafts.length > 0 && !generatingDrafts && drafts.map((draft, idx) => (
              <div key={draft.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{draft.label}</span>
                  <span className="text-[9px] text-slate-400 font-medium">Draft {idx + 1} of {drafts.length}</span>
                </div>
                <div className="p-3">
                  <p className="text-[11.5px] text-slate-700 leading-relaxed">{draft.body}</p>
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={() => navigator.clipboard?.writeText(draft.body)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy
                    </button>
                    <button onClick={() => handleSend(draft)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg font-semibold transition-all text-white ${sentDrafts.has(draft.id) ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {sentDrafts.has(draft.id) ? '✓ Sent!' : 'Send now'}
                    </button>
                  </div>


                </div>
              </div>
            ))}

            {drafts.length > 0 && !generatingDrafts && (
              <button onClick={handleGenerateDrafts}
                className="w-full py-2 border border-slate-200 rounded-xl text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors font-medium">
                ↻ Regenerate drafts
              </button>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="p-4">
            {contact.activity && contact.activity.length > 0 ? (
              <div className="relative">
                <div className="absolute left-[13px] top-0 bottom-0 w-px bg-slate-100" />
                {contact.activity.map((item: string, i: number) => {
                  let label = item
                  let dateStr = ''
                  try {
                    const parsed = JSON.parse(item)
                    const sourceMap: Record<string, string> = {
                      'LinkedIn Extension': 'Added via LinkedIn',
                      'Outlook Add-in': 'Added via Outlook',
                      'Manual': 'Added manually',
                      'manual': 'Added manually',
                    }
                    const typeMap: Record<string, string> = {
                      created: 'Contact added',
                      updated: 'Contact updated',
                      email_found: 'Email found',
                      draft_generated: 'AI drafts generated',
                      email_sent: 'Email sent',
                    }
                    if (parsed.source && sourceMap[parsed.source]) {
                      label = sourceMap[parsed.source]
                    } else if (parsed.type && typeMap[parsed.type]) {
                      label = typeMap[parsed.type]
                      if (parsed.source) label += ` via ${parsed.source}`
                    } else if (parsed.type) {
                      label = parsed.type.replace(/_/g, ' ')
                    }
                    if (parsed.date) {
                      dateStr = new Date(parsed.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }
                  } catch {
                    // not JSON, render as-is
                  }
                  return (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    <div className="w-7 h-7 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0 z-10">
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex-1 min-w-0">
                      <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">{label}</p>
                      {dateStr && <p className="text-[10px] text-slate-400 mt-0.5">{dateStr}</p>}
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-xs font-medium text-slate-500">No activity yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Activity will appear here as you interact with this contact</p>
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="p-4">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`Add notes about ${contact.firstName}...`}
              className="w-full p-3 border border-slate-200 rounded-xl text-[12px] text-slate-700 bg-slate-50 resize-none min-h-[160px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 focus:bg-white leading-relaxed transition-all placeholder:text-slate-300"
            />
            <button onClick={handleSaveNote} disabled={savingNote}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold transition-colors disabled:opacity-60">
              {savingNote ? 'Saving...' : 'Save note'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
