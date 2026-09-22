'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ContactCard from '@/components/ContactCard'
import ContactListView from '@/components/ContactListView'
import AnalyticsView from '@/components/AnalyticsView'
import MeetView from '@/components/MeetView'
import EnrichmentView from '@/components/EnrichmentView'
import IntegrationsView from '@/components/IntegrationsView'
import ContactPanel from '@/components/ContactPanel'
import AddContactModal from '@/components/AddContactModal'
import ImportModal from '@/components/ImportModal'
import Toast from '@/components/Toast'
import TrashView from '@/components/TrashView'
import { setContactTrashed } from '@/lib/contact-trash'
import AIDraftsView from '@/components/AIDraftsView'
import { normalizeFollowUp, matchesPipelineFilter, localDay, followUpDay, schedulingPatch, pipelineMovePatch } from '@/lib/follow-up'
import { Contact, NavItem, AIDraft, PipelineColumn } from '@/types'

const filters = ['All', 'This week', 'Overdue', 'Replied']

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const first = name.split(' ')[0]
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 17) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const meta = session.user.user_metadata
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: meta?.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : session.user.email || 'User'
      })
      await loadContacts(session.user.id)
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const refreshDates=()=>{setContacts(prev=>prev.map(c=>normalizeFollowUp(c)));setSelected(prev=>prev?normalizeFollowUp(prev):null)}
    const timer=setInterval(refreshDates,60000)
    window.addEventListener('focus',refreshDates)
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refreshDates)}
  }, [])

  const loadContacts = async (userId: string) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return }
    const mapped: Contact[] = (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      firstName: c.first_name as string || '',
      lastName: c.last_name as string || '',
      email: c.email as string || '',
      phone: c.phone as string || '',
      company: c.company as string || '',
      jobTitle: c.job_title as string || '',
      linkedinUrl: c.linkedin_url as string || '',
      photoUrl: c.photo_url as string || null,
      avatarColor: c.avatar_color as string || '#2563EB',
      status: c.status as Contact['status'],
      column: c.column_name as Contact['column'],
      statusLabel: c.status_label as string || '',
      sentDate: c.sent_date as string || '',
      originalEmail: c.original_email as string || '',
      enriched: c.enriched as boolean || false,
      emailStatus: (c.email_status as Contact['emailStatus']) || 'unverified',
      emailSource: c.email_source as string || '',
      emailCheckedAt: c.email_checked_at as string || null,
      emailEvidence: c.email_evidence as string || '',
      notes: c.notes as string || '',
      activity: c.activity as string[] || [],
      aiDrafts: c.ai_drafts as Contact['aiDrafts'] || undefined,
      createdAt: c.created_at as string || undefined,
    }))
    const updated = mapped.map(c=>normalizeFollowUp(c))
    setContacts(updated)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAdd = useCallback(async (contact: Contact) => {
    if (!user) return false
    contact=normalizeFollowUp(contact)
    const { data, error } = await supabase.from('contacts').insert({
      user_id: user.id,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      job_title: contact.jobTitle,
      linkedin_url: contact.linkedinUrl,
      avatar_color: contact.avatarColor,
      status: contact.status,
      column_name: contact.column,
      status_label: contact.statusLabel,
      sent_date: contact.sentDate,
      original_email: contact.originalEmail,
      enriched: contact.enriched,
      email_status: contact.emailStatus || 'unverified',
      email_source: contact.emailSource || 'manual',
      email_checked_at: contact.emailCheckedAt || null,
      email_evidence: contact.emailEvidence || '',
      notes: contact.notes,
      activity: contact.activity,
    }).select().single()
    if (error) { console.error(error); setToast(error.code==='P0001'?error.message:'Error saving contact'); return false }
    setContacts(prev => [{ ...contact, id: data.id, createdAt: data.created_at }, ...prev])
    setToast('Contact saved!')
    return true
  }, [user])

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return
    try { await setContactTrashed(supabase, user.id, id, true) }
    catch (error) { setToast((error as Error).message); return }
    setContacts(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    setToast('Contact moved to Trash. You can restore it from the sidebar.')
  }, [selected, user])

  const handleSend = useCallback((draft: AIDraft, c: Contact) => {
    if (!c.email || c.emailStatus === 'invalid') { setToast('Add a usable email before preparing a draft.'); return }
    window.location.href = 'mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent('Following up') + '&body=' + encodeURIComponent(draft.body)
    setToast('Email draft opened. Send it from your mail app when ready.')
  }, [])

  const handleUpdateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if(!user)return false
    updates = {...updates}
    const current=contacts.find(c=>c.id===id)
    if(!current){setToast('Contact not found. Refresh and try again.');return false}
    try{updates=schedulingPatch(current,updates)}catch(e){setToast(e instanceof Error?e.message:'Invalid follow-up date');return false}
    if (updates.email !== undefined && !updates.emailStatus) {
      updates.emailStatus = 'unverified'; updates.emailSource = 'manual'; updates.emailCheckedAt = null; updates.emailEvidence = ''
    }
    const dbUpdates: Record<string, unknown> = {}
    if (updates.email !== undefined) { dbUpdates.email = updates.email; dbUpdates.email_status = updates.emailStatus || 'unverified'; dbUpdates.email_checked_at = updates.emailCheckedAt || null; dbUpdates.email_source = updates.emailSource || 'manual'; dbUpdates.email_evidence = updates.emailEvidence || '' }
    if (updates.emailStatus !== undefined) dbUpdates.email_status = updates.emailStatus
    if (updates.emailSource !== undefined) dbUpdates.email_source = updates.emailSource
    if (updates.emailCheckedAt !== undefined) dbUpdates.email_checked_at = updates.emailCheckedAt
    if (updates.emailEvidence !== undefined) dbUpdates.email_evidence = updates.emailEvidence
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.company !== undefined) dbUpdates.company = updates.company
    if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle
    if (updates.enriched !== undefined) dbUpdates.enriched = updates.enriched
    if (updates.aiDrafts !== undefined) dbUpdates.ai_drafts = updates.aiDrafts
    if (updates.sentDate !== undefined) dbUpdates.sent_date = updates.sentDate
    if (updates.column !== undefined) dbUpdates.column_name = updates.column
    if (updates.statusLabel !== undefined) dbUpdates.status_label = updates.statusLabel
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if(updates.activity!==undefined)dbUpdates.activity=updates.activity
    const { data: savedContact, error } = await supabase.from('contacts').update(dbUpdates).eq('id', id).eq('user_id',user.id).is('deleted_at',null).select('id,sent_date,column_name,status,status_label').maybeSingle()
    if (error || !savedContact) { console.error('Failed to update contact:', error); setToast('Error updating contact'); return false }
    if(updates.sentDate!==undefined&&savedContact.sent_date!==updates.sentDate){setToast('The follow-up date was not saved as expected. Refresh and try again.');return false}
    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
    setSelected(prev => (prev && prev.id === id ? { ...prev, ...updates } : prev))
    return true
  }, [contacts,user])

  const handleMoveContact = useCallback(async (id: string, target: PipelineColumn) => {
    const current=contacts.find(contact=>contact.id===id)
    if(!current)return false
    const labels:Record<PipelineColumn,string>={today:'Follow up today',upcoming:'Coming up',done:'Done'}
    const patch=pipelineMovePatch(current,target)
    const saved=await handleUpdateContact(id,{
      ...patch,
      activity:[...(current.activity||[]),JSON.stringify({type:'action',label:`Moved to ${labels[target]}`,date:new Date().toISOString()})]
    })
    if(saved)setToast(`${current.firstName} moved to ${labels[target]}.`)
    return saved
  },[contacts,handleUpdateContact])

  const handleFindEmailForContact = useCallback(async (contact: Contact) => {
    if (!contact.firstName || !contact.company) { setToast('Add a contact name and company before searching.'); return false }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ contactId: contact.id, action: 'find', allowPaid: true, firstName: contact.firstName, lastName: contact.lastName, company: contact.company })
      })
      const data = await response.json()
      window.dispatchEvent(new Event('hirely:credits-changed'))
      if (response.status === 402) { setToast('Monthly email credit limit reached.'); return false }
      if (!response.ok || !data.email) { setToast(data.error || data.message || 'No work email found.'); return false }
      const saved = await handleUpdateContact(contact.id, {
        email: data.email,
        enriched: true,
        emailStatus: data.emailStatus,
        emailSource: data.emailSource,
        emailCheckedAt: data.emailCheckedAt,
        emailEvidence: data.emailEvidence,
      })
      if (!saved) return false
      setToast(data.guessed ? 'Predicted work email saved. Verify it before outreach.' : 'Work email saved.')
      return true
    } catch {
      setToast('Email search could not finish. Check your connection and try again.')
      return false
    }
  }, [handleUpdateContact])

  const todayCol = contacts.filter(c => c.column === 'today' && matchesPipelineFilter(c,filter))
  const upcomingCol = contacts.filter(c => c.column === 'upcoming' && matchesPipelineFilter(c,filter)).sort((a,b)=>(followUpDay(a)||'9999').localeCompare(followUpDay(b)||'9999'))
  const doneCol = contacts.filter(c => c.column === 'done' && matchesPipelineFilter(c,filter))
  const followUpCount = contacts.filter(c=>c.column==='today').length
  const overdueCount = contacts.filter(c => c.status === 'overdue').length
  const enrichedCount = contacts.filter(c => c.enriched).length
  const repliedCount = contacts.filter(c => c.status === 'replied' || c.status === 'meeting-set').length

  const matchesSearch = (c: Contact, query: string) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.jobTitle.toLowerCase().includes(q)
    )
  }

  const allContactsFiltered = contacts.filter(c => matchesSearch(c, searchQuery))
  const followupsFiltered = contacts
    .filter(c => c.column === 'today')
    .filter(c => matchesSearch(c, searchQuery))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
            <svg viewBox="0 0 19 19" fill="none" className="w-7 h-7">
              <rect x="1" y="1" width="4.5" height="17" fill="white"/>
              <rect x="13.5" y="1" width="4.5" height="17" fill="white"/>
              <polygon points="5.5,7.5 13.5,7.5 13.5,11.5 5.5,11.5" fill="white"/>
              <polygon points="11.5,6 16,9.5 11.5,13" fill="white"/>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm text-slate-500 font-medium">Loading Hirely...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen h-dvh min-h-0 overflow-hidden bg-slate-50">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} contactCount={contacts.length}
        overdueCount={followUpCount} userName={user?.name || ''} userEmail={user?.email || ''} onLogout={handleLogout}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:hidden">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              {activeNav === 'dashboard' && 'Dashboard'}
              {activeNav === 'contacts' && 'All Contacts'}
              {activeNav === 'followups' && 'Follow-ups'}
              {activeNav === 'ai-drafts' && 'AI Drafts'}
              {activeNav === 'analytics' && 'Analytics'}
              {activeNav === 'enrichment' && 'Email finder'}
              {activeNav === 'meet' && 'Hirely Meet'}
              {activeNav === 'settings' && 'Integrations'}
              {activeNav === 'trash' && 'Trash'}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeNav === 'dashboard' && today}
              {activeNav === 'contacts' && `${allContactsFiltered.length} of ${contacts.length} contacts`}
              {activeNav === 'followups' && `${followupsFiltered.length} needing attention`}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(activeNav === 'dashboard' || activeNav === 'contacts') && (
              <>
                <details className="relative sm:hidden" onClick={event => event.stopPropagation()}>
                  <summary aria-label="More contact actions" title="More actions" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
                  </summary>
                  <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <button type="button" onClick={() => setMobileNavOpen(true)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/></svg>
                      Search contacts
                    </button>
                    <button type="button" onClick={() => setShowImport(true)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
                      Import contacts
                    </button>
                  </div>
                </details>
                <button onClick={() => setShowImport(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Import
                </button>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span className="hidden sm:inline">Add contact</span><span className="sm:hidden">Add</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">

          {/* ── DASHBOARD VIEW ── */}
          {activeNav === 'dashboard' && (
            <div className="p-3 sm:p-6 flex flex-col gap-5">

              {/* Greeting + health strip */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl px-5 py-4 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                <div className="relative flex items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{getGreeting(user?.name || 'there')} 👋</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {overdueCount > 0
                        ? `You have ${overdueCount} follow-up${overdueCount > 1 ? 's' : ''} overdue - let’s clear them.`
                        : contacts.length === 0
                        ? 'Add your first contact to get started.'
                        : followUpCount > 0 ? `${followUpCount} contacts need your attention today.` : 'All caught up! Keep building your pipeline.'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 sm:ml-6">
                    <div className="text-2xl font-black">{followUpCount}</div>
                    <div className="text-blue-100 text-xs font-medium mt-0.5">Follow-ups due</div>
                    <div className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block ${overdueCount > 0 ? 'bg-red-500/20 text-red-100' : 'bg-emerald-500/20 text-emerald-100'}`}>
                      {overdueCount > 0 ? `${overdueCount} overdue` : 'Nothing overdue'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: 'Total contacts',
                    value: contacts.length,
                    sub: 'Click to view all',
                    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                    accent: '#2563EB', bg: 'bg-blue-50', iconColor: 'text-blue-600',
                    onClick: () => setActiveNav('contacts'),
                  },
                  {
                    label: 'Follow-ups due',
                    value: followUpCount,
                    sub: followUpCount > 0 ? `${overdueCount} overdue · ${followUpCount-overdueCount} due today` : 'All clear',
                    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                    accent: overdueCount > 0 ? '#EF4444' : '#10B981',
                    bg: overdueCount > 0 ? 'bg-red-50' : 'bg-emerald-50',
                    iconColor: overdueCount > 0 ? 'text-red-500' : 'text-emerald-500',
                    onClick: () => setActiveNav('followups'),
                  },
                  {
                    label: 'Emails enriched',
                    value: enrichedCount,
                    sub: `${contacts.length > 0 ? Math.round((enrichedCount / contacts.length) * 100) : 0}% - click to enrich more`,
                    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                    accent: '#7C3AED', bg: 'bg-violet-50', iconColor: 'text-violet-600',
                    onClick: () => setActiveNav('enrichment'),
                  },
                  {
                    label: 'Contacts replied',
                    value: repliedCount,
                    sub: repliedCount > 0 ? `${repliedCount} recorded in your CRM` : 'No replies recorded yet',
                    icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
                    accent: '#059669', bg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                    onClick: () => { setActiveNav('contacts') },
                  },
                ].map((stat, i) => (
                  <button key={i} onClick={stat.onClick}
                    className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 transition-all text-left group w-full">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <svg className={`w-4 h-4 ${stat.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                        </svg>
                      </div>
                      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{stat.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{stat.sub}</div>
                  </button>
                ))}
              </div>

              {/* Pipeline */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Recruiter Pipeline</h2>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{contacts.length} contacts</span>
                  </div>
                  <div className="flex flex-wrap bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {filters.map(f => (
                      <button key={f} aria-pressed={filter===f} onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pb-0">
                  {[
                    {
                      title: 'Follow up today',
                      count: todayCol.length,
                      dot: 'bg-red-500',
                      ring: 'ring-red-100',
                      headerBg: 'bg-red-50',
                      badge: 'bg-red-100 text-red-700',
                      contacts: todayCol,
                      empty: filter==='All'?'No urgent follow-ups':'No matching contacts',
                      emptySub: 'You\'re on top of things!'
                    },
                    {
                      title: 'Coming up',
                      count: upcomingCol.length,
                      dot: 'bg-amber-400',
                      ring: 'ring-amber-100',
                      headerBg: 'bg-amber-50',
                      badge: 'bg-amber-100 text-amber-700',
                      contacts: upcomingCol,
                      empty: 'Pipeline is empty',
                      emptySub: 'Add contacts to get started'
                    },
                    {
                      title: 'Done',
                      count: doneCol.length,
                      dot: 'bg-emerald-500',
                      ring: 'ring-emerald-100',
                      headerBg: 'bg-emerald-50',
                      badge: 'bg-emerald-100 text-emerald-700',
                      contacts: doneCol,
                      empty: 'Nothing completed yet',
                      emptySub: 'Closed contacts appear here'
                    },
                  ].map((col) => (
                    <div key={col.title} className="w-[calc(100vw-2.5rem)] min-w-[calc(100vw-2.5rem)] snap-start bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col shadow-sm lg:w-auto lg:min-w-0">
                      {/* Column header */}
                      <div className={`flex items-center justify-between px-4 py-3 ${col.headerBg} border-b border-slate-100`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span className="text-xs font-bold text-slate-700">{col.title}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${col.badge}`}>{col.count}</span>
                      </div>

                      {/* Cards */}
                      <div className="p-3 flex min-h-[280px] max-h-[65dvh] flex-col gap-2 overflow-y-auto overscroll-contain lg:max-h-[400px]">
                        {col.contacts.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                            <div className={`w-10 h-10 rounded-full ${col.headerBg} flex items-center justify-center mb-3`}>
                              <div className={`w-3 h-3 rounded-full ${col.dot} opacity-50`} />
                            </div>
                            <p className="text-xs font-medium text-slate-500">{col.empty}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{col.emptySub}</p>
                            {col.title === 'Coming up' && (
                              <button onClick={() => setShowAdd(true)} className="mt-3 text-[11px] text-blue-600 font-semibold hover:underline">+ Add contact</button>
                            )}
                          </div>
                        ) : (
                          col.contacts.map(c => (
                            <ContactCard key={c.id} contact={c} isSelected={selected?.id === c.id}
                              onClick={() => setSelected(c)} onDelete={handleDelete} onMove={handleMoveContact} />
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              {(() => {
                const actions = []
                const noEmail = contacts.filter(c => c.column !== 'done' && !c.email)
                const noDrafts = contacts.filter(c => c.column !== 'done' && c.email && (!c.aiDrafts || c.aiDrafts.length === 0))
                const stale = contacts.filter(c => !followUpDay(c) && c.createdAt && Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000) >= 7 && c.column === 'upcoming')
                const overdue = contacts.filter(c => c.status === 'overdue')

                if (overdue.length > 0) actions.push({
                  icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100',
                  title: `${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}`,
                  desc: 'These contacts need your attention today',
                  cta: 'View now', action: () => setActiveNav('followups'),
                })
                if (noEmail.length > 0) actions.push({
                  icon: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
                  color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
                  title: `Find emails for ${noEmail.length} contact${noEmail.length > 1 ? 's' : ''}`,
                  desc: 'Find work emails before your next outreach',
                  cta: 'Open Email finder', action: () => setActiveNav('enrichment'),
                })
                if (noDrafts.length > 0) actions.push({
                  icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                  color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
                  title: `Generate drafts for ${noDrafts.length} contact${noDrafts.length > 1 ? 's' : ''}`,
                  desc: 'Prepare a draft for your next conversation',
                  cta: 'Go to AI Drafts', action: () => setActiveNav('ai-drafts'),
                })
                if (stale.length > 0) actions.push({
                  icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
                  title: `${stale.length} contact${stale.length > 1 ? 's' : ''} sitting 7+ days`,
                  desc: 'Choose a follow-up date for these unscheduled contacts',
                  cta: 'View contacts', action: () => setActiveNav('contacts'),
                })

                if (actions.length === 0) return null

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Suggested actions</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {actions.slice(0, 4).map((a, i) => (
                        <button key={i} onClick={a.action}
                          className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                          <div className={`w-8 h-8 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0`}>
                            <svg className={`w-4 h-4 ${a.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-bold ${a.color} leading-tight`}>{a.title}</p>
                            <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">{a.desc}</p>
                            <p className={`text-[10px] font-semibold ${a.color} mt-1.5 group-hover:underline`}>{a.cta} →</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

            </div>
          )}

          {activeNav === 'contacts' && (
            <div className="px-3 sm:px-6 py-4">
              <ContactListView contacts={allContactsFiltered} selectedId={selected?.id} onSelect={setSelected}
                onDelete={handleDelete} onMove={handleMoveContact} onFindEmail={handleFindEmailForContact}
                emptyMessage={searchQuery ? 'No contacts match your search.' : 'No contacts yet - add one to get started.'} />
            </div>
          )}

          {activeNav === 'followups' && (
            <div className="px-3 sm:px-6 py-4">
              <ContactListView contacts={followupsFiltered} selectedId={selected?.id} onSelect={setSelected}
                onDelete={handleDelete} onMove={handleMoveContact} onFindEmail={handleFindEmailForContact}
                emptyMessage="Nothing due - you're all caught up! 🎉" />
            </div>
          )}

          {activeNav === 'analytics' && <AnalyticsView contacts={contacts} />}
          {activeNav === 'meet' && <MeetView contacts={contacts} />}
          {activeNav === 'enrichment' && <EnrichmentView contacts={contacts} onSelect={setSelected} onUpdateContact={handleUpdateContact} />}
          {activeNav === 'settings' && <IntegrationsView />}
          {activeNav === 'trash' && user && <TrashView userId={user.id} onRestored={() => loadContacts(user.id)} />}

          {activeNav === 'ai-drafts' && (
            <AIDraftsView contacts={contacts} onSelect={(c) => { setSelected(c); setActiveNav('contacts'); }} />
          )}
        </div>
      </div>

      {(activeNav === 'dashboard' || activeNav === 'contacts' || activeNav === 'followups' || activeNav === 'enrichment') && selected && (
        <ContactPanel contact={selected} onClose={() => setSelected(null)} onSendDraft={handleSend} onUpdateContact={handleUpdateContact} onMoveContact={handleMoveContact} />
      )}
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onOpenIntegrations={() => setActiveNav('settings')} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
