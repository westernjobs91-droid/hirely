'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ContactCard from '@/components/ContactCard'
import ContactPanel from '@/components/ContactPanel'
import AddContactModal from '@/components/AddContactModal'
import ImportModal from '@/components/ImportModal'
import Toast from '@/components/Toast'
import { Contact, NavItem, AIDraft } from '@/types'
import { mockContacts } from '@/lib/data'

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const statConfig = [
  { label: 'Follow-ups due', key: 'due', accent: 'from-red-500 to-red-600', valColor: 'text-red-500', sub: '2 overdue now', subColor: 'text-red-400' },
  { label: 'Total contacts', key: 'total', accent: 'from-blue-600 to-violet-600', valColor: 'text-slate-900', sub: '+3 this week', subColor: 'text-emerald-500' },
  { label: 'Reply rate', key: 'reply', accent: 'from-emerald-500 to-teal-600', valColor: 'text-emerald-500', sub: 'Above average', subColor: 'text-emerald-500' },
  { label: 'Emails sent', key: 'sent', accent: 'from-amber-400 to-orange-500', valColor: 'text-slate-900', sub: 'This month', subColor: 'text-slate-400' },
]

const filters = ['All', 'This week', 'Overdue', 'Replied']

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')

  const todayCol = contacts.filter(c => c.column === 'today')
  const upcomingCol = contacts.filter(c => c.column === 'upcoming')
  const doneCol = contacts.filter(c => c.column === 'done')
  const overdueCount = contacts.filter(c => c.status === 'overdue').length

  const handleAdd = useCallback((c: Contact) => {
    setContacts(prev => [c, ...prev])
    setToast('Contact saved - AI drafts ready - Hunter.io enriching...')
  }, [])

  const handleSend = useCallback((draft: AIDraft, c: Contact) => {
    setToast(`Follow-up sent to ${c.firstName} ${c.lastName}`)
  }, [])

  const statValues: Record<string, string | number> = {
    due: overdueCount, total: contacts.length, reply: '34%', sent: 24
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} contactCount={contacts.length} overdueCount={overdueCount} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{today} - {overdueCount} follow-up{overdueCount !== 1 ? 's' : ''} overdue today</p>
          </div>
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
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 px-5 py-3.5 bg-white border-b border-slate-100">
            {statConfig.map(s => (
              <div key={s.key} className="bg-slate-50 rounded-xl p-3 relative overflow-hidden border border-slate-100">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
                <p className="text-[10px] text-slate-400 font-medium mb-1">{s.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${s.valColor}`}>{statValues[s.key]}</p>
                <p className={`text-[10px] mt-1 font-medium ${s.subColor}`}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Recruiter pipeline</h2>
              <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {filters.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[11px] rounded-md border-none font-medium transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}>
                    {f}
                  </button>
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
                    {col.contacts.map(c => (
                      <ContactCard key={c.id} contact={c} isSelected={selected?.id === c.id} onClick={() => setSelected(c)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ContactPanel contact={selected} onClose={() => setSelected(null)} onSendDraft={handleSend} />

      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
