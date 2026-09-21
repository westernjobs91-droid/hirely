'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Entitlements, PLANS, Plan } from '@/lib/plans'
import { useRouter } from 'next/navigation'
export default function PricingPage() {
  const router = useRouter()
  const [account, setAccount] = useState<Entitlements | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { (async () => {
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const {data,error} = await supabase.rpc('get_hirely_entitlements')
    if(error) setError('Plan details are temporarily unavailable.')
    else setAccount(data)
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
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <button onClick={()=>router.push('/')} className="mb-8 text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to dashboard</button>
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Plan &amp; billing</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Choose the plan that fits your pipeline</h1>
      <p className="mt-3 text-slate-600">Monthly prices in USD, plus applicable tax. Cancel anytime. Usage resets on the first of each month (UTC).</p></div>
      {process.env.NEXT_PUBLIC_STRIPE_MODE === 'sandbox' && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Test mode:</strong> no real payments are collected and test subscriptions are temporary.</p>}
      {account && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><span>Your plan: <strong>{PLANS[account.plan].name}</strong>{account.source==='manual'?' · Complimentary access':''}</span>
        {account.billing_managed && <button disabled={busy} onClick={()=>billing()} className="font-semibold text-blue-600 underline disabled:opacity-50">Manage subscription</button>}</div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="my-8 grid gap-5 md:grid-cols-3">{(Object.keys(PLANS) as Plan[]).map(id=>{
        const plan=PLANS[id], highlighted=id==='solo'
        return <section key={id} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${highlighted?'border-blue-500 ring-2 ring-blue-100':'border-slate-200'}`}>
          {highlighted && <span className="absolute -top-3 left-5 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Best for solo recruiters</span>}
          <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2><p className="my-4 text-4xl font-black tracking-tight text-slate-900">${plan.monthlyUsd}<span className="text-sm font-normal text-slate-500"> /month</span></p>
          <ul className="flex-1 space-y-3 text-sm text-slate-700">
            <li>✓ {plan.contacts ?? 'Unlimited'} active contacts</li><li>✓ {plan.email} result-based email credits/month</li>
            <li>✓ {plan.meet ? plan.meet+' Meet summary requests/month' : 'Meeting notes; summaries on paid plans'}</li>
            <li>✓ {plan.drafts ? plan.drafts+' AI draft generations/month' : 'AI drafts on paid plans'}</li>
            <li>✓ LinkedIn capture, pipeline, follow-ups, notes and Trash</li>
            {id!=='free' && <li>✓ Outlook capture</li>}
          </ul>
          <button disabled={id==='free'||busy||!account||account.plan===id||account.source==='manual'} onClick={()=>billing(id)} className={`mt-7 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${highlighted?'bg-blue-600 text-white hover:bg-blue-700':'bg-slate-900 text-white hover:bg-slate-800'}`}>
            {account?.plan===id ? 'Current plan' : id==='free' ? 'Free forever' : 'Choose '+plan.name}</button>
        </section>
      })}</div>
      <div className="grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-900">How usage works</h2><p className="mt-2 text-sm leading-6 text-slate-600">Email searches use one credit only when an address is returned. Failed and no-result searches use zero. Meet summaries and draft generations use one request credit when AI processing starts.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-slate-900">Agency · Coming soon</h2><p className="mt-2 text-sm leading-6 text-slate-600">Shared workspaces, team permissions, and pooled allowances are in development.</p></section></div>
      <p className="mt-6 text-xs text-slate-500">New paid subscriptions are sold through Link. Use the checkout email to manage your subscription and payment method.</p>
    </div>
  </main>
}
