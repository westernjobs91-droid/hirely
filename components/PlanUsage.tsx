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
 if(!account)return <p className="text-xs text-slate-500">Usage details unavailable.</p>
 return <div className="rounded-xl border bg-white p-4 text-xs text-slate-600" aria-label="Plan usage">
  <p className="font-semibold">{PLANS[account.plan].name} · Monthly usage</p>
  <p className="mt-2">Email: {account.email_used}/{account.email_limit} · Meet: {account.meet_used}/{account.meet_limit} · Drafts: {account.draft_used}/{account.draft_limit}</p>
  <p className="mt-2">Resets on the first of each month (UTC). <a href="/pricing" className="text-blue-600 underline">View plans</a></p>
 </div>
}
