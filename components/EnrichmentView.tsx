'use client'
import { useState } from 'react'
import { Contact } from '@/types'
import { supabase } from '@/lib/supabase'
import EmailStatusBadge from './EmailStatusBadge'
interface Props { contacts: Contact[]; onSelect:(c:Contact)=>void; onUpdateContact:(id:string,u:Partial<Contact>)=>Promise<boolean> }
export default function EnrichmentView({contacts,onSelect,onUpdateContact}:Props) {
 const [busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState(''),[query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
 const visible=contacts.filter(c=>[c.firstName,c.lastName,c.company,c.email].join(' ').toLowerCase().includes(query.toLowerCase()) && (filter==='all'||filter==='missing'&&!c.email||filter==='review'&&!!c.email&&c.emailStatus!=='valid'))
 async function run(c:Contact,action='predict') {
  setBusy(String(c.id));setMessage('')
  try {
   const {data:{session}}=await supabase.auth.getSession()
   const res=await fetch('/api/enrich',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session?.access_token},body:JSON.stringify({contactId:c.id,action,allowPaid:action!=='predict'})})
   const data=await res.json()
   if(!res.ok) throw new Error(data.error||'Lookup failed')
   if(data.email) {
    const saved=await onUpdateContact(c.id,{email:data.email,enriched:true,emailStatus:data.emailStatus,emailSource:data.emailSource,emailCheckedAt:data.emailCheckedAt,emailEvidence:data.emailEvidence})
    if(!saved) throw new Error('Could not refresh contact')
    setMessage(action==='predict'?'Saved result without a paid provider request.':'Result saved. Review its verification status.')
   } else setMessage(data.message||'No result found')
  }catch(e){setMessage(e instanceof Error?e.message:'Lookup failed')}finally{setBusy(null)}
 }
 async function bulk() {
  setBusy('bulk')
  for(const c of visible.filter(c=>!c.email)){ await run(c);setBusy('bulk') }
  setBusy(null);setMessage('Free prediction pass complete. Review results before contacting anyone.')
 }
 return <section className="p-6 space-y-5">
  <div><h2 className="text-xl font-bold text-slate-900">Email finder</h2><p className="text-sm text-slate-500 mt-1">Use saved company patterns for free. Choose a paid request only when you need it.</p></div>
  <div className="flex flex-wrap gap-3"><input aria-label="Search email contacts" className="border rounded-lg px-3 py-2" placeholder="Name or company" value={query} onChange={e=>setQuery(e.target.value)}/>
  <select aria-label="Email filter" className="border rounded-lg px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All contacts</option><option value="missing">Missing email</option><option value="review">Needs review</option></select>
  <button disabled={!!busy} onClick={bulk} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50">Predict missing emails — free</button></div>
  {message&&<p role="status" className="p-3 bg-blue-50 rounded-lg text-sm">{message}</p>}
  <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr>{['Contact','Company','Email','Status','Actions'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead>
  <tbody>{visible.map(c=><tr key={c.id} className="border-t"><td className="p-3"><button onClick={()=>onSelect(c)} className="text-blue-700 text-left font-semibold">{c.firstName} {c.lastName}</button><p className="text-xs text-slate-500">{c.jobTitle}</p></td><td className="p-3">{c.company}</td><td className="p-3 break-all">{c.email||'Not found'}</td><td className="p-3"><EmailStatusBadge contact={c}/></td><td className="p-3"><div className="flex gap-2 flex-wrap">
   {!c.email&&<button disabled={!!busy} onClick={()=>run(c)} className="border rounded px-2 py-1 disabled:opacity-50">Predict free</button>}
   <button disabled={!!busy} onClick={()=>run(c,c.email?'verify':'find')} className="border rounded px-2 py-1 disabled:opacity-50">{busy===String(c.id)?'Working…':c.email?'Verify — paid':'Find — paid'}</button>
  </div></td></tr>)}</tbody></table>{!visible.length&&<p className="p-8 text-slate-500">No contacts match this view.</p>}</div>
  <p className="text-xs text-slate-500">Paid requests count toward your monthly request limit, including unsuccessful attempts. Predictions are not inbox verification.</p>
 </section>
}
