'use client'

import { Contact } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

interface AnalyticsViewProps {
  contacts: Contact[]
}

const COLORS = {
  blue: '#2563EB',
  violet: '#7C3AED',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  cyan: '#0891B2',
  slate: '#64748B',
}

function StatCard({ label, value, sub, color, icon }: {
  label: string
  value: string | number
  sub: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: color, opacity: 0.25 }} />
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] font-semibold text-slate-500 mt-1">{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className="text-blue-600 font-bold">{payload[0].value} contacts</p>
      </div>
    )
  }
  return null
}

export default function AnalyticsView({ contacts }: AnalyticsViewProps) {
  const total = contacts.length

  // Pipeline stage
  const stageCounts = {
    today: contacts.filter(c => c.column === 'today').length,
    upcoming: contacts.filter(c => c.column === 'upcoming').length,
    done: contacts.filter(c => c.column === 'done').length,
  }
  const pieData = [
    { name: 'Follow up today', value: stageCounts.today, color: COLORS.red },
    { name: 'Coming up', value: stageCounts.upcoming, color: COLORS.amber },
    { name: 'Done', value: stageCounts.done, color: COLORS.emerald },
  ].filter(d => d.value > 0)

  // Enrichment
  const enrichedCount = contacts.filter(c => c.enriched).length
  const withEmailCount = contacts.filter(c => c.email).length
  const enrichmentPie = [
    { name: 'Enriched', value: enrichedCount, color: COLORS.violet },
    { name: 'Not enriched', value: total - enrichedCount, color: '#E2E8F0' },
  ]

  // Top companies
  const companyMap = new Map<string, number>()
  contacts.forEach(c => {
    const name = c.company?.trim()
    if (name) companyMap.set(name, (companyMap.get(name) || 0) + 1)
  })
  const topCompanies = Array.from(companyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
  const maxCompany = Math.max(...topCompanies.map(c => c[1]), 1)

  // Weekly contacts added
  const weeklyData: { label: string; count: number }[] = []
  const withDates = contacts.filter(c => c.createdAt)
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
    weeklyData.push({ label: i === 0 ? 'This week' : `${i}w ago`, count })
  }

  // Reply rate
  const repliedCount = contacts.filter(c => c.status === 'replied' || c.status === 'meeting-set').length
  const replyRate = total > 0 ? Math.round((repliedCount / total) * 100) : 0

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">Add contacts to see analytics</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total contacts" value={total} sub="in your pipeline"
          color={COLORS.blue}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Emails enriched" value={`${total > 0 ? Math.round((enrichedCount / total) * 100) : 0}%`}
          sub={`${enrichedCount} of ${total} contacts`}
          color={COLORS.violet}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          label="Companies reached" value={companyMap.size}
          sub={`across ${total} contacts`}
          color={COLORS.cyan}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          label="Reply rate" value={`${replyRate}%`}
          sub={`${repliedCount} replied or meeting set`}
          color={COLORS.emerald}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-4">

        {/* Weekly bar chart */}
        <div className="col-span-2">
          <SectionCard title="Contacts added — last 6 weeks">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', radius: 6 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.label === 'This week' ? COLORS.blue : '#BFDBFE'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Pipeline donut */}
        <SectionCard title="Pipeline stages">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => <span style={{ fontSize: 10, color: '#64748B' }}>{value}</span>}
                />
                <Tooltip formatter={(value: any) => [`${value} contacts`, '']}
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-xs text-slate-400">
              No pipeline data yet
            </div>
          )}
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-4">

        {/* Top companies horizontal bars */}
        <div className="col-span-2">
          <SectionCard title="Top companies">
            <div className="space-y-3">
              {topCompanies.length === 0 ? (
                <p className="text-xs text-slate-400">No company data yet</p>
              ) : (
                topCompanies.map(([name, count], i) => {
                  const pct = Math.max((count / maxCompany) * 100, 6)
                  const hue = [COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.emerald, COLORS.amber, COLORS.red, COLORS.slate]
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] text-slate-700 font-medium truncate">{name}</span>
                        <span className="text-[11px] font-bold text-slate-900 ml-2 flex-shrink-0">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: hue[i % hue.length] }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>
        </div>

        {/* Enrichment donut */}
        <SectionCard title="Email enrichment">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={enrichmentPie}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {enrichmentPie.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <div className="text-2xl font-black text-slate-900">{total > 0 ? Math.round((enrichedCount / total) * 100) : 0}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{enrichedCount} of {total} enriched</div>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.violet }} />
              <span className="text-[10px] text-slate-500">Enriched</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-200" />
              <span className="text-[10px] text-slate-500">Pending</span>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
