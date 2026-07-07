'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import ContactCard from '@/components/ContactCard'
import ContactListView from '@/components/ContactListView'
import AnalyticsView from '@/components/AnalyticsView'
import EnrichmentView from '@/components/EnrichmentView'
import ContactPanel from '@/components/ContactPanel'
import AddContactModal from '@/components/AddContactModal'
import ImportModal from '@/components/ImportModal'
import Toast from '@/components/Toast'
import { Contact, NavItem, AIDraft } from '@/types'

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const filters = ['All', 'This week', 'Overdue', 'Replied']

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

  const loadContacts = async (userId: string) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
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
      avatarColor: c.avatar_color as string || '#2563EB',
      status: c.status as Contact['status'],
      column: c.column_name as Contact['column'],
      statusLabel: c.status_label as string || '',
      sentDate: c.sent_date as string || '',
      originalEmail: c.original_email as string || '',
      enriched: c.enriched as boolean || false,
      notes: c.notes as string || '',
      activity: c.activity as string[] || [],
      aiDrafts: c.ai_drafts as Contact['aiDrafts'] || undefined,
      createdAt: c.created_at as string || undefined,
    }))
    setContacts(mapped)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAdd = useCallback(async (contact: Contact) => {
    if (!user) return
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
      notes: contact.notes,
      activity: contact.activity,
    }).select().single()
    if (error) { console.error(error); setToast('Error saving contact'); return }
    setContacts(prev => [{ ...contact, id: data.id }, ...prev])
    setToast('Contact saved - Hunter.io enriching...')
  }, [user])

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) { setToast('Error deleting contact'); return }
    setContacts(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    setToast('Contact deleted')
  }, [selected])

  const handleSend = useCallback((draft: AIDraft, c: Contact) => {
    setToast(`Follow-up sent to ${c.firstName} ${c.lastName}`)
  }, [])

  const handleUpdateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const dbUpdates: Record<string, string | boolean | Contact['aiDrafts']> = {}
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.company !== undefined) dbUpdates.company = updates.company
    if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle
    if (updates.enriched !== undefined) dbUpdates.enriched = updates.enriched
    if (updates.aiDrafts !== undefined) dbUpdates.ai_drafts = updates.aiDrafts

    const { error } = await supabase.from('contacts').update(dbUpdates).eq('id', id)
    if (error) {
      console.error('Failed to update contact:', error)
      setToast('Error updating contact')
      return false
    }

    setContacts(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
    setSelected(prev => (prev && prev.id === id ? { ...prev, ...updates } : prev))
    return true
  }, [])

  const todayCol = contacts.filter(c => c.column === 'today')
  const upcomingCol = contacts.filter(c => c.column === 'upcoming')
  const doneCol = contacts.filter(c => c.column === 'done')
  const overdueCount = contacts.filter(c => c.status === 'overdue').length

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
    .filter(c => c.status === 'overdue' || c.status === 'due-today')
    .filter(c => matchesSearch(c, searchQuery))

  const statConfig = [
    { label: 'Follow-ups due', val: overdueCount, accent: 'from-red-500 to-red-600', valColor: 'text-red-500', sub: `${overdueCount} overdue now`, subColor: 'text-red-400' },
    { label: 'Total contacts', val: contacts.length, accent: 'from-blue-600 to-violet-600', valColor: 'text-slate-900', sub: 'All time', subColor: 'text-emerald-500' },
    { label: 'Reply rate', val: '34%', accent: 'from-emerald-500 to-teal-600', valColor: 'text-emerald-500', sub: 'Above average', subColor: 'text-emerald-500' },
    { label: 'Emails sent', val: 0, accent: 'from-amber-400 to-orange-500', valColor: 'text-slate-900', sub: 'This month', subColor: 'text-slate-400' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F8FAFC,#EFF6FF)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
            <svg viewBox="0 0 19 19" fill="none" className="w-6 h-6">
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} contactCount={contacts.length}
        overdueCount={overdueCount} userName={user?.name || ''} userEmail={user?.email || ''} onLogout={handleLogout}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
              {activeNav === 'dashboard' && 'Dashboard'}
              {activeNav === 'contacts' && 'Contacts'}
              {activeNav === 'followups' && 'Follow-ups'}
              {activeNav === 'ai-drafts' && 'AI Drafts'}
              {activeNav === 'analytics' && 'Analytics'}
              {activeNav === 'enrichment' && 'Enrichment'}
              {activeNav === 'settings' && 'Integrations'}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeNav === 'dashboard' && `${today} - ${overdueCount} follow-up${overdueCount !== 1 ? 's' : ''} overdue today`}
              {activeNav === 'contacts' && `${allContactsFiltered.length} of ${contacts.length} contacts`}
              {activeNav === 'followups' && `${followupsFiltered.length} needing follow-up`}
            </p>
          </div>
          {(activeNav === 'dashboard' || activeNav === 'contacts') && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import
              </button>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-all" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,.25)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add contact
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeNav === 'dashboard' && (
          <>
          <div className="grid grid-cols-4 gap-3 px-5 py-3.5 bg-white border-b border-slate-100">
            {statConfig.map((s, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 relative overflow-hidden border border-slate-100">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
                <p className="text-[10px] text-slate-400 font-medium mb-1">{s.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${s.valColor}`}>{s.val}</p>
                <p className={`text-[10px] mt-1 font-medium ${s.subColor}`}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Recruiter pipeline</h2>
              <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {filters.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[11px] rounded-md border-none font-medium transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { title: 'Follow up today', dot: 'bg-red-500', glow: 'shadow-[0_0_0_3px_rgba(239,68,68,.15)]', contacts: todayCol },
                { title: 'Coming up', dot: 'bg-amber-400', glow: 'shadow-[0_0_0_3px_rgba(245,158,11,.15)]', contacts: upcomingCol },
                { title: 'Done', dot: 'bg-emerald-500', glow: 'shadow-[0_0_0_3px_rgba(16,185,129,.15)]', contacts: doneCol },
              ].map((col) => (
                <div key={col.title} className="bg-white border border-slate-100 rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${col.dot} ${col.glow}`} />
                      <span className="text-xs font-semibold text-slate-900">{col.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-medium">{col.contacts.length}</span>
                  </div>
                  <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-72">
                    {col.contacts.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-slate-400">No contacts here yet</p>
                        {col.title === 'Follow up today' && (
                          <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-600 font-medium hover:underline">+ Add first contact</button>
                        )}
                      </div>
                    ) : (
                      col.contacts.map(c => (
                        <ContactCard
                          key={c.id}
                          contact={c}
                          isSelected={selected?.id === c.id}
                          onClick={() => setSelected(c)}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          {activeNav === 'contacts' && (
            <div className="px-5 py-4">
              <ContactListView
                contacts={allContactsFiltered}
                selectedId={selected?.id}
                onSelect={setSelected}
                onDelete={handleDelete}
                emptyMessage={searchQuery ? 'No contacts match your search.' : 'No contacts yet — add one to get started.'}
              />
            </div>
          )}

          {activeNav === 'followups' && (
            <div className="px-5 py-4">
              <ContactListView
                contacts={followupsFiltered}
                selectedId={selected?.id}
                onSelect={setSelected}
                onDelete={handleDelete}
                emptyMessage="Nothing due — you're all caught up."
              />
            </div>
          )}

          {activeNav === 'analytics' && <AnalyticsView contacts={contacts} />}

          {activeNav === 'enrichment' && (
            <EnrichmentView contacts={contacts} onSelect={setSelected} onUpdateContact={handleUpdateContact} />
          )}

          {(activeNav === 'ai-drafts' || activeNav === 'settings') && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center max-w-sm">
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {activeNav === 'ai-drafts' && 'A dedicated AI Drafts view is coming soon.'}
                  {activeNav === 'settings' && 'Integrations settings are coming soon.'}
                </p>
                <p className="text-xs text-slate-400">
                  {activeNav === 'ai-drafts'
                    ? 'For now, generate and manage drafts from each contact\u2019s own panel.'
                    : 'Check back soon.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ContactPanel contact={selected} onClose={() => setSelected(null)} onSendDraft={handleSend} onUpdateContact={handleUpdateContact} />
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
