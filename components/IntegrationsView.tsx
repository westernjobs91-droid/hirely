'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Entitlements, PLANS } from '@/lib/plans'

const Check = ({ className = 'text-emerald-600' }: { className?: string }) => <svg className={`h-4 w-4 flex-none ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>

export default function IntegrationsView() {
  const [account, setAccount] = useState<Entitlements | null>(null)

  useEffect(() => {
    let active = true
    supabase.rpc('get_hirely_entitlements').then(({ data, error }) => {
      if (active && !error) setAccount(data)
    })
    return () => { active = false }
  }, [])

  const outlookIncluded = account?.outlook === true

  return <div className="mx-auto max-w-[1440px] space-y-5 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.8 10.2a4 4 0 0 0-5.6 0l-4 4a4 4 0 0 0 5.6 5.6l1.1-1.1m-.7-4.9a4 4 0 0 0 5.6 0l4-4a4 4 0 0 0-5.6-5.6l-1.1 1.1" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Capture anywhere</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Bring new contacts into Hirely</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Save people while you work in LinkedIn or Outlook, then manage every follow-up from one pipeline.</p>
          </div>
        </div>
        <div className={`rounded-2xl border px-4 py-3 sm:min-w-64 ${outlookIncluded ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your integration access</p>
          {account ? <><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-950">{PLANS[account.plan].name} plan</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${outlookIncluded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{outlookIncluded ? 'Outlook included' : 'LinkedIn included'}</span></div>{!outlookIncluded && <a href="/pricing" className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">Compare paid plans →</a>}</> : <div className="mt-2 h-5 w-40 animate-pulse rounded bg-slate-200" />}
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Outlook workflow">
      {[
        ['1', 'Open an email', 'Choose a message in Outlook and open Hirely from Apps.'],
        ['2', 'Review the contact', 'Hirely fills the sender or recipient name and email.'],
        ['3', 'Save to your pipeline', 'Add company or title if known, then save the contact.'],
      ].map(([number, title, detail]) => <div key={number} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{number}</span>
        <div className="min-w-0"><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>
      </div>)}
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <article className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-700" />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50"><svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.8 10.2a4 4 0 0 0-5.6 0l-4 4a4 4 0 0 0 5.6 5.6l1.1-1.1m-.7-4.9a4 4 0 0 0 5.6 0l4-4a4 4 0 0 0-5.6-5.6l-1.1 1.1" /></svg></div><div><h3 className="text-base font-black text-slate-950">LinkedIn extension</h3><p className="text-xs text-slate-500">One-click profile capture</p></div></div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">All plans</span>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">Capture the profile you are viewing, including name, title, company, LinkedIn URL and profile photo.</p>
          <ul className="mt-4 space-y-2 text-xs text-slate-600"><li className="flex gap-2"><Check />Review details before saving</li><li className="flex gap-2"><Check />Duplicate and trash checks</li><li className="flex gap-2"><Check />No email credit used during capture</li></ul>
          <div className="mt-auto pt-6"><a href="/downloads/hirely-extension-1.3.3.zip" download className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" /></svg>Download Chrome extension</a><p className="mt-2 text-center text-[10px] leading-4 text-slate-400">Beta install through Chrome’s Extensions page.</p></div>
        </div>
      </article>

      <article className="flex flex-col overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm ring-4 ring-violet-50">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-700" />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50"><svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m3 8 7.9 5.3a2 2 0 0 0 2.2 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" /></svg></div><div><h3 className="text-base font-black text-slate-950">Outlook add-in</h3><p className="text-xs text-slate-500">Sender and recipient capture</p></div></div>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">Solo + Pro</span>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">Open an email, review the person Hirely found and save them without copying details between tabs.</p>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">Private by design</p><p className="mt-1 text-xs leading-5 text-slate-600">The add-in reads the current message’s sender or first recipient. It does not scan your mailbox, and Hirely does not save the message body.</p></div>
          <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Install the beta</p><ol className="mt-3 space-y-2.5">{[
            'Download the Hirely manifest file below.',
            'In Outlook, open Apps or Get Add-ins, then My add-ins.',
            'Under Custom add-ins, choose Add from file and select the manifest.',
            'Open an email and choose Save to Hirely from Apps.',
          ].map((step, i) => <li key={step} className="flex items-start gap-2.5"><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{i + 1}</span><span className="text-xs leading-5 text-slate-600">{step}</span></li>)}</ol></div>
          <div className="mt-auto pt-6"><a href="/outlook/manifest.xml" download="hirely-outlook-manifest.xml" className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition ${outlookIncluded ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" /></svg>Download Outlook manifest</a>{!outlookIncluded && account && <p className="mt-2 text-center text-[10px] text-slate-500">Installation is available now; saving contacts requires Solo or Pro.</p>}</div>
        </div>
      </article>
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
      <div className="grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Plan access</p><h3 className="mt-2 text-xl font-black">Choose by pipeline size</h3><p className="mt-2 text-sm leading-6 text-slate-300">Outlook capture has no separate usage charge. It follows your plan’s active-contact limit.</p><a href="/pricing" className="mt-4 inline-flex text-sm font-bold text-blue-300 hover:text-blue-200">View full plan details →</a></div>
        <div className="grid gap-px bg-slate-800 sm:grid-cols-3">{[
          ['Free', '$0', 'LinkedIn capture', '50 contacts'],
          ['Solo', '$29', 'LinkedIn + Outlook', '1,000 contacts'],
          ['Pro', '$59', 'LinkedIn + Outlook', 'Unlimited contacts'],
        ].map(([name, price, integration, contacts]) => <div key={name} className="bg-slate-900/90 p-5"><div className="flex items-baseline justify-between gap-2"><p className="text-sm font-bold">{name}</p><p className="text-xs font-semibold text-slate-400">{price}/mo</p></div><p className="mt-4 text-xs font-semibold text-white">{integration}</p><p className="mt-1 text-xs text-slate-400">{contacts}</p></div>)}</div>
      </div>
    </section>

    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">Need help installing Outlook?</p><p className="mt-1 text-xs text-slate-500">Some Microsoft 365 organizations block custom add-ins. Your Microsoft 365 admin can deploy the same manifest to your team.</p></div><a href="mailto:jay@hirelypro.com" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Contact support</a></section>
  </div>
}
