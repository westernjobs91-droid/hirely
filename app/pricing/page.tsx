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
  return <main className="max-w-6xl mx-auto px-6 py-12">
    <button onClick={()=>router.push('/')} className="text-blue-600 mb-8">← Back to dashboard</button>
    <h1 className="text-3xl font-bold">Choose your Hirely plan</h1>
    <p className="text-slate-500 mt-3">Monthly prices in USD, plus applicable tax. Cancel anytime. Usage resets on the first of each month (UTC).</p>
    <p className="text-sm text-slate-500 mt-2">New subscriptions are sold through Link. Use the email from checkout to manage your subscription and payment method in Link.</p>
    {account && <p className="mt-4">Your plan: {PLANS[account.plan].name}{account.source==='manual'?' · Complimentary access':''}
      {account.billing_managed && <button disabled={busy} onClick={()=>billing()} className="ml-4 text-blue-600 underline">Manage subscription</button>}</p>}
    {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
    <div className="grid md:grid-cols-3 gap-6 my-8">{(Object.keys(PLANS) as Plan[]).map(id=>{
      const plan=PLANS[id]
      return <section key={id} className="rounded-2xl border p-6">
        <h2 className="text-xl font-bold">{plan.name}</h2><p className="text-3xl font-bold my-4">${plan.monthlyUsd}<span className="text-sm font-normal"> /month</span></p>
        <ul className="space-y-3 text-sm">
          <li>{plan.contacts ?? 'Unlimited'} active contacts</li><li>{plan.email} email credits/month</li>
          <li>{plan.meet ? plan.meet+' Meet summary requests/month' : 'Meeting notes; AI summaries on paid plans'}</li>
          <li>{plan.drafts ? plan.drafts+' AI draft generations/month (3 drafts each)' : 'AI drafts on paid plans'}</li>
          <li>LinkedIn capture, pipeline, follow-ups, notes and Trash</li>
          {id!=='free' && <li>Outlook capture</li>}
        </ul>
        {id!=='free' && <button disabled={busy||!account||account.plan===id||account.source==='manual'} onClick={()=>billing(id)} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-white disabled:opacity-50">
          {account?.plan===id ? 'Current plan' : 'Choose '+plan.name}</button>}
      </section>
    })}</div>
    <p className="text-sm text-slate-600">Email searches use one credit when an address is returned; no-result and failed searches use zero. Completed email verifications use one credit. Meet summaries and draft generations use one request credit when AI processing starts.</p>
    <section className="mt-8 rounded-2xl border p-6"><h2 className="font-bold">Agency · Coming soon</h2><p className="mt-2 text-slate-500">Shared workspaces, team permissions and pooled allowances are in development.</p></section>
  </main>
}
