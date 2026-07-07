'use client'

import { useEffect, useState } from 'react'

interface IntegrationStatus {
  apollo: boolean
  hunter: boolean
  anthropic: boolean
}

function StatusBadge({ connected }: { connected: boolean | null }) {
  if (connected === null) {
    return <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full font-medium">Checking...</span>
  }
  return connected ? (
    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
    </span>
  ) : (
    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Not configured
    </span>
  )
}

function IntegrationCard({
  icon, name, description, connected, footnote
}: {
  icon: React.ReactNode
  name: string
  description: string
  connected: boolean | null
  footnote?: string
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <p className="text-[13px] font-semibold text-slate-900">{name}</p>
        </div>
        <StatusBadge connected={connected} />
      </div>
      <p className="text-[11.5px] text-slate-500 leading-relaxed">{description}</p>
      {footnote && <p className="text-[10.5px] text-slate-400 mt-2 italic">{footnote}</p>}
    </div>
  )
}

export default function IntegrationsView() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)

  useEffect(() => {
    fetch('/api/integrations/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(() => setStatus({ apollo: false, hunter: false, anthropic: false }))
  }, [])

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Enrichment & AI</p>
        <div className="grid grid-cols-3 gap-3">
          <IntegrationCard
            name="Apollo"
            description="Finds email addresses and resolves company names during enrichment."
            connected={status?.apollo ?? null}
            footnote="Requires a paid Apollo plan for full functionality."
            icon={<svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
          <IntegrationCard
            name="Hunter.io"
            description="Fallback email finder, pattern matching, and live email verification."
            connected={status?.hunter ?? null}
            icon={<svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          />
          <IntegrationCard
            name="Anthropic (Claude)"
            description="Writes your AI follow-up drafts based on each contact's profile."
            connected={status?.anthropic ?? null}
            icon={<svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
        </div>
        <p className="text-[10.5px] text-slate-400 mt-2">
          These are configured server-side in Vercel&apos;s environment variables — there&apos;s nothing to connect from here. This just confirms each key is present.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Capture tools</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </div>
              <p className="text-[13px] font-semibold text-slate-900">Chrome Extension</p>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed mb-2">
              Adds a &quot;Save to Hirely&quot; tab on LinkedIn profiles. Scrapes name, title, company, and photo with one click.
            </p>
            <p className="text-[10.5px] text-slate-400 italic">Currently sideloaded — not yet published to the Chrome Web Store.</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-[13px] font-semibold text-slate-900">Outlook Add-in</p>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed mb-2">
              Adds a &quot;Save to Hirely&quot; button when reading an email. Captures the sender (or recipient, for sent mail).
            </p>
            <p className="text-[10.5px] text-slate-400 italic">Currently sideloaded per-person — not yet deployed org-wide.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
