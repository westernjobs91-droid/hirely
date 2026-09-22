'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Entitlements, PLANS } from '@/lib/plans'
export default function PlanUsage() {
 const [account,setAccount]=useState<Entitlements|null>(null)
 useEffect(()=>{
  let active=true
  const load=async()=>{const {data,error}=await supabase.rpc('get_hirely_entitlements');if(active)setAccount(error?null:data)}
  load();window.addEventListener('hirely:credits-changed',load)
  return()=>{active=false;window.removeEventListener('hirely:credits-changed',load)}
 },[])
 if(!account)return <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label="Loading plan usage"/>
 const usage=[
  {label:'Email',used:account.email_used,limit:account.email_limit,color:'bg-blue-500'},
  {label:'Meet',used:account.meet_used,limit:account.meet_limit,color:'bg-violet-500'},
  {label:'Drafts',used:account.draft_used,limit:account.draft_limit,color:'bg-amber-500'},
 ]
 return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-5" aria-label="Plan usage">
  <div className="flex items-center justify-between gap-4 sm:w-40 sm:block">
   <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly usage</p><p className="mt-1 text-sm font-bold text-slate-900">{PLANS[account.plan].name} plan</p></div>
   <a href="/pricing" className="text-[11px] font-semibold text-blue-600 hover:underline sm:mt-1 sm:inline-block">View plans</a>
  </div>
  <div className="mt-4 grid flex-1 grid-cols-3 gap-3 sm:mt-0">
   {usage.map(item=>{const pct=Math.min((item.used/Math.max(item.limit,1))*100,100);return <div key={item.label} className="min-w-0">
    <div className="flex items-center justify-between gap-1 text-[10px]"><span className="font-semibold text-slate-600">{item.label}</span><span className="text-slate-400"><strong className="text-slate-700">{item.used}</strong>/{item.limit}</span></div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{width:`${pct}%`}}/></div>
   </div>})}
  </div>
 </div>
}
