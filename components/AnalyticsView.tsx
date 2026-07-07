'use client'

import { Contact } from '@/types'

interface AnalyticsViewProps {
  contacts: Contact[]
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11.5px] text-slate-600 truncate">{label}</span>
        <span className="text-[11px] font-semibold text-slate-900 flex-shrink-0 ml-2">{count}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AnalyticsView({ contacts }: AnalyticsViewProps) {
  const total = contacts.length

  // Pipeline stage breakdown
  const stageCounts = {
    today: contacts.filter(c => c.column === 'today').length,
    upcoming: contacts.filter(c => c.column === 'upcoming').length,
    done: contacts.filter(c => c.column === 'done').length,
  }

  // Status breakdown
  const statusLabels: Record<string, string> = {
    overdue: 'Overdue',
    'due-today': 'Due today',
    upcoming: 'Upcoming',
    replied: 'Replied',
    'meeting-set': 'Meeting set',
    'no-response': 'No response',
  }
  const statusCounts = Object.keys(statusLabels).map(key => ({
    label: statusLabels[key],
    count: contacts.filter(c => c.status === key).length,
  })).filter(s => s.count > 0)
  const maxStatus = Math.max(...statusCounts.map(s => s.count), 1)

  // Top companies
  const companyMap = new Map<string, number>()
  contacts.forEach(c => {
    const name = c.company?.trim()
    if (name) companyMap.set(name, (companyMap.get(name) || 0) + 1)
  })
  const topCompanies = Array.from(companyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxCompany = Math.max(...topCompanies.map(c => c[1]), 1)

  // Enrichment rate
  const enrichedCount = contacts.filter(c => c.enriched).length
  const withEmailCount = contacts.filter(c => c.email).length

  // Contacts added per week (last 6 weeks), using createdAt if available
  const weeklyBuckets: { label: string; count: number }[] = []
  const withDates = contacts.filter(c => c.createdAt)
  if (withDates.length > 0) {
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i + 1) * 7)
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - i * 7)
      const count = withDates.filter(c => {
        const d = new Date(c.createdAt as string)
        return d > weekStart && d <= weekEnd
      }).length
      weeklyBuckets.push({
        label: i === 0 ? 'This week' : `${i}w ago`,
        count,
      })
    }
  }
  const maxWeekly = Math.max(...weeklyBuckets.map(w => w.count), 1)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-slate-400">Add some contacts to see analytics here.</p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Top summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-1">Enrichment rate</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{total > 0 ? Math.round((enrichedCount / total) * 100) : 0}%</p>
          <p className="text-[10px] text-slate-400 mt-1">{enrichedCount} of {total} enriched</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-1">Have an email on file</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{total > 0 ? Math.round((withEmailCount / total) * 100) : 0}%</p>
          <p className="text-[10px] text-slate-400 mt-1">{withEmailCount} of {total} contacts</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-[10px] text-slate-400 font-medium mb-1">Companies reached</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{companyMap.size}</p>
          <p className="text-[10px] text-slate-400 mt-1">across {total} contacts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Pipeline stage */}
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-xs font-semibold text-slate-900 mb-3">Pipeline stage</p>
          <BarRow label="Follow up today" count={stageCounts.today} max={Math.max(stageCounts.today, stageCounts.upcoming, stageCounts.done, 1)} color="#EF4444" />
          <BarRow label="Coming up" count={stageCounts.upcoming} max={Math.max(stageCounts.today, stageCounts.upcoming, stageCounts.done, 1)} color="#F59E0B" />
          <BarRow label="Done" count={stageCounts.done} max={Math.max(stageCounts.today, stageCounts.upcoming, stageCounts.done, 1)} color="#10B981" />
        </div>

        {/* Status breakdown */}
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-xs font-semibold text-slate-900 mb-3">Status breakdown</p>
          {statusCounts.length === 0 ? (
            <p className="text-[11px] text-slate-400">No status data yet.</p>
          ) : (
            statusCounts.map(s => (
              <BarRow key={s.label} label={s.label} count={s.count} max={maxStatus} color="#2563EB" />
            ))
          )}
        </div>

        {/* Top companies */}
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-xs font-semibold text-slate-900 mb-3">Top companies</p>
          {topCompanies.length === 0 ? (
            <p className="text-[11px] text-slate-400">No company data yet.</p>
          ) : (
            topCompanies.map(([name, count]) => (
              <BarRow key={name} label={name} count={count} max={maxCompany} color="#7C3AED" />
            ))
          )}
        </div>

        {/* Contacts added over time */}
        <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <p className="text-xs font-semibold text-slate-900 mb-3">Contacts added (last 6 weeks)</p>
          {weeklyBuckets.length === 0 ? (
            <p className="text-[11px] text-slate-400">Not enough date history yet for this chart — new contacts saved from now on will show up here.</p>
          ) : (
            weeklyBuckets.map(w => (
              <BarRow key={w.label} label={w.label} count={w.count} max={maxWeekly} color="#0891B2" />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
