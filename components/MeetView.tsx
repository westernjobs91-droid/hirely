'use client'
import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {Contact} from '@/types'
type Meeting={id:string;title:string;meeting_type:string;raw_notes:string;summary:string|null;contact_id:number|null;created_at:string;status:string}
export default function MeetView({contacts}:{contacts:Contact[]}){
 const [meetings,setMeetings]=useState<Meeting[]>([]),[id,setId]=useState(''),[title,setTitle]=useState(''),[notes,setNotes]=useState(''),[kind,setKind]=useState('client_intake'),[contactId,setContactId]=useState(''),[summary,setSummary]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function headers(){const {data:{session}}=await supabase.auth.getSession();return {'Content-Type':'application/json',Authorization:'Bearer '+session?.access_token}}
 async function load(){try{const r=await fetch('/api/meet',{headers:await headers()});const d=await r.json();if(!r.ok)throw new Error(d.error);setMeetings(d.meetings||[])}catch(e){setMessage(e instanceof Error?e.message:'Could not load meetings')}}
 useEffect(()=>{setId(crypto.randomUUID());load()},[])
 function fresh(){setId(crypto.randomUUID());setTitle('');setNotes('');setKind('client_intake');setContactId('');setSummary('');setMessage('')}
 function choose(m:Meeting){setId(m.id);setTitle(m.title);setNotes(m.raw_notes);setKind(m.meeting_type);setContactId(m.contact_id?String(m.contact_id):'');setSummary(m.summary||'');setMessage('')}
 async function save(action:string){
  setBusy(true);setMessage('')
  try{const r=await fetch('/api/meet',{method:'POST',headers:await headers(),body:JSON.stringify({id,title,notes,meeting_type:kind,contactId:contactId||null,action})});const d=await r.json();if(d.summary)setSummary(d.summary);if(!r.ok)throw new Error(d.error);setSummary(d.meeting?.summary||'');await load();setMessage(action==='save'?'Meeting notes saved.':'Summary saved. Review it against your notes.')}
  catch(e){setMessage(e instanceof Error?e.message:'Could not save meeting')}finally{setBusy(false)}
 }
 return <section className="p-6 space-y-5">
 <div className="flex justify-between"><div><h2 className="text-xl font-bold">Hirely Meet</h2><p className="text-sm text-slate-500 mt-1">Turn recruiting conversations into useful notes and clear next steps.</p></div><button disabled={busy} onClick={fresh} className="border rounded-lg px-4 py-2">New meeting</button></div>
 {message&&<p role="status" className="bg-blue-50 p-3 rounded-lg text-sm">{message}</p>}
 <div className="grid lg:grid-cols-[240px_1fr] gap-5">
 <aside className="bg-white border rounded-xl p-3"><h3 className="font-semibold text-sm mb-3">Saved meetings</h3>{!meetings.length&&<p className="text-sm text-slate-500">Your saved conversations will appear here.</p>}<div className="space-y-2 max-h-[650px] overflow-y-auto">{meetings.map(m=><button key={m.id} disabled={busy} onClick={()=>choose(m)} className={'w-full text-left p-3 rounded-lg '+(m.id===id?'bg-blue-50':'hover:bg-slate-50')}><p className="font-medium text-sm">{m.title}</p><p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString()} · {m.status}</p></button>)}</div></aside>
 <div className="space-y-4 bg-white border rounded-xl p-5">
 <label className="block text-sm font-medium">Meeting title<input disabled={busy} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Staffing requirements — Example Foods" className="block w-full border rounded-lg p-2 mt-1"/></label>
 <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Conversation type<select disabled={busy} value={kind} onChange={e=>{setKind(e.target.value);setSummary('')}} className="block w-full border rounded-lg p-2 mt-1"><option value="client_intake">Client intake</option><option value="candidate_interview">Candidate interview</option><option value="internal_debrief">Internal debrief</option></select></label>
 <label className="text-sm">Linked CRM contact<select disabled={busy} value={contactId} onChange={e=>setContactId(e.target.value)} className="block w-full border rounded-lg p-2 mt-1"><option value="">No linked contact</option>{contacts.map(c=><option key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} — {c.company}</option>)}</select></label></div>
 <label className="block text-sm font-medium">Notes or transcript<textarea disabled={busy} value={notes} maxLength={40000} onChange={e=>{setNotes(e.target.value);setSummary('')}} rows={10} placeholder="Paste a transcript or write your notes here…" className="block w-full border rounded-lg p-3 mt-1 font-normal"/></label>
 <p className="text-xs text-slate-500">Save notes for free. Generate summary sends these notes to the configured AI service and uses one summary request. This workspace does not record calls.</p>
 <div className="flex gap-3"><button disabled={busy||!title.trim()||!notes.trim()} onClick={()=>save('save')} className="border rounded-lg px-4 py-2 disabled:opacity-50">Save notes</button><button disabled={busy||!title.trim()||!notes.trim()} onClick={()=>save('summarize')} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy?'Working…':'Generate summary'}</button></div>
 {summary&&<div className="border-t pt-4"><div className="flex justify-between"><h3 className="font-semibold">Meeting summary</h3><button onClick={()=>navigator.clipboard.writeText(summary).then(()=>setMessage('Summary copied.')).catch(()=>setMessage('Copy unavailable. Select the summary text to copy.'))} className="text-blue-600 text-sm">Copy summary</button></div><div className="whitespace-pre-wrap text-sm leading-7 mt-3">{summary}</div></div>}
 </div></div></section>
}
