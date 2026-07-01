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

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'week' | 'overdue' | 'replied'>('all')

  const todayContacts = contacts.filter(c => c.column === 'today')
  const upcomingContacts = contacts.filter(c => c.column === 'upcoming')
  const doneContacts = contacts.filter(c => c.column === 'done')
  const overdueCount = contacts.filter(c => c.status === 'overdue').length

  const handleAddContact = useCallback((contact: Contact) => {
    setContacts(prev => [contact, ...prev])
    setToast('Contact saved - AI drafts ready - Hunter.io enriching...')
  }, [])

  const handleSendDraft = useCallback((draft: AIDraft, contact: Contact) => {
    setToast(`Follow-up sent to ${contact.firstName} ${contact.lastName}`)
  }, [])

  const filterButtons = [
    { id: 'all' as const, label: 'All' },
    { id: 'week' as const, label: 'This week' },
    { id: 'overdue' as const, label: 'Overdue' },
    { id: 'replied' as const, label: 'Replied' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        contactCount={contacts.length}
        overdueCount={overdueCount}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <h1 className="text-sm font-medium text-gray-900">Dashboard</h1>
            <p className="text-[11px] text-gray-400">{today} - {overdueCount} follow-up{overdueCount !== 1 ? 's' : ''} overdue today</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add contact
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-gray-100 bg-white">
            {[
              { label: 'Follow-ups due', value: overdueCount, color: 'text-red-600', sub: `${overdueCount} overdue`, subColor: 'text-red-500', accent: 'border-red-400' },
              { label: 'Total contacts', value: contacts.length, color: 'text-gray-900', sub: '+3 this week', subColor: 'text-green-600', accent: 'border-blue-400' },
              { label: 'Reply rate', value: '34%', color: 'text-green-600', sub: 'Above average', subColor: 'text-green-600', accent: 'border-green-400' },
              { label: 'Emails sent', value: 24, color: 'text-gray-900', sub: 'This month', subColor: 'text-gray-400', accent: 'border-amber-400' },
            ].map((stat, i) => (
              <div key={i} className={`bg-gray-50 rounded-lg p-3 border-t-2 ${stat.accent}`}>
                <p className="text-[10px] text-gray-400 mb-1">{stat.label}</p>
                <p className={`text-2xl font-medium ${stat.color}`}>{stat.value}</p>
                <p className={`text-[10px] mt-1 ${stat.subColor}`}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Recruiter pipeline</h2>
              <div className="flex gap-1.5">
                {filterButtons.map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id)}
                    className={`px-3 py-1 text-[11px] rounded-full border transition-colors ${
                      filter === btn.id
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'text-gray-400 border-gray-200 hover:text-gray-600'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Follow up today */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs font-medium text-gray-900">Follow up today</span>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{todayContacts.length}</span>
                </div>
                <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-72">
                  {todayContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContact?.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                    />
                  ))}
                </div>
              </div>

              {/* Coming up */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-xs font-medium text-gray-900">Coming up</span>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{upcomingContacts.length}</span>
                </div>
                <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-72">
                  {upcomingContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContact?.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                    />
                  ))}
                </div>
              </div>

              {/* Done */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-gray-900">Done</span>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{doneContacts.length}</span>
                </div>
                <div className="p-2 flex flex-col gap-1.5 overflow-y-auto max-h-72">
                  {doneContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContact?.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact detail panel */}
      <ContactPanel
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onSendDraft={handleSendDraft}
      />

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContact}
        />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
