'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Entitlements, PLANS, Plan } from '@/lib/plans'

const PLAN_COPY: Record<Plan, { description: string; eyebrow: string; tone: string }> = {
  free: { eyebrow: 'Start simple', description: 'Capture contacts and organize your first recruiting pipeline.', tone: 'from-slate-700 to-slate-900' },
  solo: { eyebrow: 'Independent recruiter', description: 'Everything an independent recruiter needs to source and follow up.', tone: 'from-blue-600 to-blue-700' },
  pro: { eyebrow: 'For growing pipelines', description: 'Higher monthly allowances for recruiters working at greater volume.', tone: 'from-violet-600 to-indigo-700' },
}

function Check({ muted = false }: { muted?: boolean }) {
  return <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${muted ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={muted?'M8 12h8':'m5 13 4 4L19 7'} /></svg>
  </span>
}

function PlanFeature({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <li className={`flex items-start gap-2.5 text-sm leading-6 ${muted ? 'text-slate-500' : 'text-slate-700'}`}><Check muted={muted} /><span>{children}</span></li>
}

export default function PricingPage() {
  const router = useRouter()
  const [account, setAccount] = useState<Entitlements | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { (async () => {
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const {data,error} = await supabase.rpc('get_hirely_entitlements')
    if(error) setError('Plan details are temporarily unavailable.')
    else setAccount(data)
    setLoadingAccount(false)
  })() }, [router])

  async function billing(plan?: Plan) {
    setBusy(true); setError('')
    try {
      const {data:{session}} = await supabase.auth.getSession()
      const result = await fetch('/api/stripe/' + (plan ? 'checkout' : 'portal'), {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+session?.access_token},
        body:JSON.stringify(plan ? {plan} : {}),
      })
      const data = await result.json()
      if(!result.ok || !data.url) throw new Error(data.error || 'Billing unavailable.')
      window.location.href = data.url
    } catch(e) {setError(e instanceof Error ? e.message : 'Billing unavailable.');setBusy(false)}
  }

  function buttonLabel(id: Plan) {
    if (busy) return 'Opening checkout…'
    return `Choose ${PLANS[id].name}`
  }

  return <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
    <div className="relative overflow-hidden border-b border-blue-100 bg-white">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.20),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between" aria-label="Pricing navigation">
          <button onClick={()=>router.push('/')} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" /></svg>
            Back to dashboard
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm">H</span><span className="hidden sm:inline">Hirely</span></div>
        </nav>

        <div className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Simple monthly pricing</span>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl">A plan that grows with your pipeline</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Start free, upgrade when your recruiting work grows, and pay for email searches only when Hirely returns an address.</p>
        </div>

        <div className="mx-auto mt-9 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['M5 13l4 4L19 7','Only pay for found emails'],
            ['M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z','Allowances reset monthly'],
            ['M6 18 18 6M6 6l12 12','Cancel anytime'],
          ].map(([path,label])=><div key={label} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur"><svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={path}/></svg>{label}</div>)}
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {process.env.NEXT_PUBLIC_STRIPE_MODE === 'sandbox' && <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg><p><strong>Test mode is active.</strong> No real payment is collected, and test subscriptions are temporary.</p></div>}

      {account && <section className="mb-7 flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Your account</p><p className="mt-1 text-sm text-slate-700">You’re on <strong className="text-slate-950">{PLANS[account.plan].name}</strong>{account.source==='manual'?' with complimentary access':''}.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-600"><span>Email <strong>{account.email_used}/{account.email_limit}</strong> used</span><span>Meet <strong>{account.meet_used}/{account.meet_limit}</strong> used</span><span>Drafts <strong>{account.draft_used}/{account.draft_limit}</strong> used</span></div>
        {account.billing_managed && <button disabled={busy} onClick={()=>billing()} className="min-h-10 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-50">Manage subscription</button>}
      </section>}

      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="grid items-stretch gap-5 lg:grid-cols-3">{(Object.keys(PLANS) as Plan[]).map(id=>{
        const plan=PLANS[id], copy=PLAN_COPY[id], highlighted=id==='solo', isCurrent=account?.plan===id
        const canPurchase=id!=='free'&&!loadingAccount&&!!account&&!isCurrent&&account.source!=='manual'
        return <section key={id} className={`relative flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)] ${highlighted?'border-blue-400 ring-4 ring-blue-100/70':'border-slate-200'}`}>
          <div className={`h-1.5 bg-gradient-to-r ${copy.tone}`} />
          <div className="flex flex-1 flex-col p-6 sm:p-7">
            <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${highlighted?'text-blue-600':id==='pro'?'text-violet-600':'text-slate-500'}`}>{copy.eyebrow}</p>
              {highlighted && <span className="flex-shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">Most popular</span>}
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{plan.name}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{copy.description}</p>
            <div className="mt-5 flex items-end gap-1"><span className="text-5xl font-black tracking-[-0.04em] text-slate-950">${plan.monthlyUsd}</span><span className="pb-1.5 text-sm font-medium text-slate-500">USD / month</span></div>
            <div className="my-6 h-px bg-slate-100" />
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">What’s included</p>
            <ul className="flex-1 space-y-2.5">
              <PlanFeature><strong>{plan.contacts ?? 'Unlimited'}</strong> active contacts</PlanFeature>
              <PlanFeature><strong>{plan.email}</strong> returned-email credits each month</PlanFeature>
              <PlanFeature muted={!plan.meet}>{plan.meet ? <><strong>{plan.meet}</strong> Hirely Meet summaries each month</> : <>Meeting notes included; AI summaries on paid plans</>}</PlanFeature>
              <PlanFeature muted={!plan.drafts}>{plan.drafts ? <><strong>{plan.drafts}</strong> AI draft generations each month</> : <>AI draft generation on paid plans</>}</PlanFeature>
              <PlanFeature>LinkedIn capture, pipeline, follow-ups, notes and Trash</PlanFeature>
              {id!=='free' && <PlanFeature>Outlook contact capture</PlanFeature>}
            </ul>
            <div className="mt-7">
              {loadingAccount ? <div role="status" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">Checking your account…</div>
              : isCurrent ? <div className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7"/></svg>Current plan</div>
              : id==='free' ? <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">Free plan included</div>
              : account?.source==='manual' ? <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-center text-sm font-semibold text-blue-700">Included with your Pro access</div>
              : !account ? <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">Plan unavailable</div>
              : <button disabled={!canPurchase||busy} onClick={()=>billing(id)} className={`min-h-12 w-full cursor-pointer rounded-xl px-4 text-sm font-bold shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${highlighted?'bg-blue-600 text-white hover:bg-blue-700':'bg-slate-900 text-white hover:bg-slate-800'}`}>{buttonLabel(id)}</button>}
            </div>
          </div>
        </section>
      })}</div>

      <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-xl"><div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 sm:p-8 lg:p-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Clear usage rules</p><h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Credits should buy a result</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Email searches use one credit only when an address is returned. Failed searches and no-result searches use zero credits. Meet summaries and draft generations use one request when AI processing starts.</p></div>
        <div className="grid gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-1">{[['Email','Charged only when found'],['Meet','One credit per AI summary'],['Drafts','One credit per generation']].map(([title,detail])=><div key={title} className="bg-slate-900/80 px-6 py-5"><p className="text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>)}</div>
      </div></section>

      <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 shadow-sm">Coming soon</span><h2 className="mt-3 text-xl font-black text-slate-950">Hirely Agency</h2><p className="mt-1 text-sm leading-6 text-slate-600">Shared workspaces, team permissions, and pooled allowances for recruiting teams.</p></div><div className="rounded-2xl border border-white bg-white/70 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">Built for collaborative recruiting</div></section>

      <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-slate-500">Monthly prices are in USD, plus applicable tax. Usage resets on the first day of each month in UTC. New paid subscriptions are sold through Link; use your checkout email to manage your subscription and payment method.</p>
    </div>
  </main>
}
