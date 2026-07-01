'use client'

import { NavItem } from '@/types'

interface SidebarProps {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
  contactCount: number
  overdueCount: number
}

const mainNav = [
  { id: 'dashboard' as NavItem, label: 'Dashboard', path: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-6a1 1 0 00-1-1h-6z' },
  { id: 'contacts' as NavItem, label: 'Contacts', path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', badge: 'contacts' },
  { id: 'followups' as NavItem, label: 'Follow-ups', path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', badge: 'overdue' },
  { id: 'ai-drafts' as NavItem, label: 'AI Drafts', path: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
]

const insightNav = [
  { id: 'analytics' as NavItem, label: 'Analytics', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'enrichment' as NavItem, label: 'Enrichment', path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'settings' as NavItem, label: 'Integrations', path: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
]

function NavBtn({ item, active, onClick, contactCount, overdueCount }: {
  item: typeof mainNav[0], active: boolean, onClick: () => void,
  contactCount?: number, overdueCount?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] mb-0.5 transition-all text-left relative ${
        active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 rounded-r-full" />}
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
      </svg>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge === 'contacts' && (
        <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">{contactCount}</span>
      )}
      {item.badge === 'overdue' && overdueCount && overdueCount > 0 && (
        <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{overdueCount}</span>
      )}
    </button>
  )
}

export default function Sidebar({ activeNav, onNavChange, contactCount, overdueCount }: SidebarProps) {
  return (
    <aside className="w-52 min-w-[208px] bg-white border-r border-slate-100 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
          <svg viewBox="0 0 19 19" fill="none" className="w-5 h-5">
            <rect x="1" y="1" width="4.5" height="17" fill="white"/>
            <rect x="13.5" y="1" width="4.5" height="17" fill="white"/>
            <polygon points="5.5,7.5 13.5,7.5 13.5,11.5 5.5,11.5" fill="white"/>
            <polygon points="11.5,6 16,9.5 11.5,13" fill="white"/>
          </svg>
        </div>
        <span className="text-base font-semibold text-slate-900 tracking-tight">Hirely</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-white transition-colors">
          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px] text-slate-400 flex-1">Search contacts...</span>
          <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">⌘K</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">Main</p>
        {mainNav.map(item => (
          <NavBtn key={item.id} item={item} active={activeNav === item.id} onClick={() => onNavChange(item.id)} contactCount={contactCount} overdueCount={overdueCount} />
        ))}
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5 mt-4">Insights</p>
        {insightNav.map(item => (
          <NavBtn key={item.id} item={item} active={activeNav === item.id} onClick={() => onNavChange(item.id)} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-2">
        <button onClick={() => onNavChange('settings')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}>JS</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">Jey Singh</p>
            <p className="text-[10px] text-slate-400">Pro plan</p>
          </div>
          <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </aside>
  )
}
