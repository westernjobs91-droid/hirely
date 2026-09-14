'use client'
import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {Contact} from '@/types'
const AUDIO_UPLOADS_ENABLED = false
type Meeting={id:string;title:string;meeting_type:string;raw_notes:string;summary:string|null;contact_id:number|null;created_at:string;status:string}
export default function MeetView({contacts}:{contacts:Contact[]}){
 const [audioFile,setAudioFile]=useState<File|null>(null),[audioStage,setAudioStage]=useState(''),[audioInputKey,setAudioInputKey]=useState(0)
 const [meetingQuery,setMeetingQuery]=useState('')
 const [meetings,setMeetings]=useState<Meeting[]>([]),[id,setId]=useState(''),[title,setTitle]=useState(''),[notes,setNotes]=useState(''),[kind,setKind]=useState('client_intake'),[contactId,setContactId]=useState(''),[summary,setSummary]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function headers(){const {data:{session}}=await supabase.auth.getSession();return {'Content-Type':'application/json',Authorization:'Bearer '+session?.access_token}}
 async function load(){try{const r=await fetch('/api/meet',{headers:await headers()});const d=await r.json();if(!r.ok)throw new Error(d.error);setMeetings(d.meetings||[])}catch(e){setMessage(e instanceof Error?e.message:'Could not load meetings')}}
 useEffect(()=>{setId(crypto.randomUUID());load()},[])
 function resetAudio(){setAudioFile(null);setAudioStage('');setAudioInputKey(k=>k+1)}
 function fresh(){resetAudio();setId(crypto.randomUUID());setTitle('');setNotes('');setKind('client_intake');setContactId('');setSummary('');setMessage('')}
 function choose(m:Meeting){resetAudio();setId(m.id);setTitle(m.title);setNotes(m.raw_notes);setKind(m.meeting_type);setContactId(m.contact_id?String(m.contact_id):'');setSummary(m.summary||'');setMessage('')}
 async function save(action:string){
  setBusy(true);setMessage('')
  try{const r=await fetch('/api/meet',{method:'POST',headers:await headers(),body:JSON.stringify({id,title,notes,meeting_type:kind,contactId:contactId||null,action})});const d=await r.json();if(d.summary)setSummary(d.summary);if(!r.ok)throw new Error(d.error);setSummary(d.meeting?.summary||'');await load();setMessage(action==='save'?'Meeting notes saved.':'Summary saved. Review it against your notes.')}
  catch(e){setMessage(e instanceof Error?e.message:'Could not save meeting')}finally{setBusy(false)}
 }
 async function transcribeAudio(){
  if(!audioFile||busy)return
  setBusy(true);setMessage('');setAudioStage('Uploading audio…')
  let uploadedPath=''
  try{
   const file=audioFile
   const requestHeaders=await headers()
   const start=await fetch('/api/meet/audio',{method:'POST',headers:requestHeaders,body:JSON.stringify({action:'upload',name:file.name,size:file.size})})
   const upload=await start.json();if(!start.ok)throw new Error(upload.error||'Could not prepare upload')
   uploadedPath=upload.path
   const mime:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',webm:'audio/webm',ogg:'audio/ogg',flac:'audio/flac',mp4:'video/mp4'}
   const {error}=await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path,upload.token,file,{contentType:mime[file.name.split('.').pop()?.toLowerCase()||'']})
   if(error)throw new Error('Upload failed. Check the file size and try again.')
   setAudioStage('Transcribing audio…')
   const response=await fetch('/api/meet/audio',{method:'POST',headers:requestHeaders,body:JSON.stringify({action:'transcribe',path:upload.path,allowPaid:true})})
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not transcribe audio')
   const combined=[notes.trim(),result.transcript].filter(Boolean).join('\n\n')
   setNotes(combined);setSummary('')
   const meetingTitle=title.trim()||file.name.replace(/\.[^.]+$/,'').slice(0,200)
   setTitle(meetingTitle);resetAudio()
   if(combined.length>40000){setMessage('Transcript ready. Shorten the notes to 40,000 characters before saving. Copy the full transcript first.');return}
   setAudioStage('Saving transcript…')
   const saved=await fetch('/api/meet',{method:'POST',headers:requestHeaders,body:JSON.stringify({id,title:meetingTitle,notes:combined,meeting_type:kind,contactId:contactId||null,action:'save'})})
   const savedResult=await saved.json();if(!saved.ok)throw new Error('Transcript is in your notes, but could not be saved. '+(savedResult.error||'Try Save notes.'))
   await load();setMessage('Transcript saved. Review the notes, then Generate summary for organized notes, key points and next steps.')
  }catch(e){setMessage(e instanceof Error?e.message:'Audio processing failed')}
  finally{if(uploadedPath)await supabase.storage.from('hirely-meet-audio').remove([uploadedPath]).catch(()=>{});setBusy(false);setAudioStage('')}
 }
 function printSummary(){
  const printWindow=window.open('','_blank','width=900,height=750')
  if(!printWindow){setMessage('Allow the print window to open, then try again.');return}
  printWindow.opener=null
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
  printWindow.document.write('<!doctype html><html><head><title>'+escape(title||'Hirely meeting document')+'</title><style>body{font:14px/1.7 system-ui,sans-serif;color:#172033;padding:40px;max-width:800px;margin:auto}h1{font-size:25px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#64748b}@media print{body{padding:0}}</style></head><body><small>HIRELY MEET</small><h1>'+escape(title)+'</h1><pre>'+escape(summary)+'</pre></body></html>')
  printWindow.document.close();printWindow.focus();printWindow.print()
 }
 const field="block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:opacity-60 mt-2"
 const kinds:Record<string,string>={client_intake:'Client intake',candidate_interview:'Candidate interview',internal_debrief:'Internal debrief'}
 const filtered=meetings.filter(m=>m.title.toLowerCase().includes(meetingQuery.toLowerCase()))
 return <section className="max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-4">
   <div className="flex items-center gap-3.5"><div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center"><svg aria-hidden="true" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg></div><div><h2 className="text-2xl font-bold tracking-tight text-slate-900">Hirely Meet</h2><p className="text-sm text-slate-500 mt-1">Every conversation, ready for the next step.</p></div></div>
   <button disabled={busy} onClick={fresh} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"><span aria-hidden="true" className="text-xl leading-none">+</span>New meeting</button>
  </header>
  <div className="grid sm:grid-cols-3 gap-3">
   {[['Saved meetings',meetings.length,'bg-blue-50 text-blue-700'],['Summaries ready',meetings.filter(m=>!!m.summary).length,'bg-violet-50 text-violet-700'],['Linked to your CRM',meetings.filter(m=>!!m.contact_id).length,'bg-emerald-50 text-emerald-700']].map(([label,value,color])=><div key={String(label)} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><span className={'rounded-xl px-3 py-1.5 text-xl font-bold '+color}>{value}</span></div>)}
  </div>
  {message&&<p role="status" className="border border-blue-100 bg-blue-50 text-blue-800 px-4 py-3 rounded-xl text-sm">{message}</p>}
  <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
   <aside className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
    <div className="p-4 border-b border-slate-100"><div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm text-slate-900">Your meetings</h3><span className="text-xs text-slate-400">{meetings.length}</span></div><input aria-label="Search meetings" value={meetingQuery} onChange={e=>setMeetingQuery(e.target.value)} placeholder="Search meetings" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"/></div>
    <div className="p-2 space-y-1 max-h-[300px] lg:max-h-[680px] overflow-y-auto">{filtered.map(m=><button key={m.id} disabled={busy} onClick={()=>choose(m)} aria-current={m.id===id?'true':undefined} className={'w-full text-left p-3.5 rounded-xl transition disabled:opacity-60 '+(m.id===id?'bg-blue-50 ring-1 ring-inset ring-blue-100':'hover:bg-slate-50')}><p className={'font-semibold text-sm break-words '+(m.id===id?'text-blue-700':'text-slate-800')}>{m.title}</p><p className="text-[11px] text-slate-400 mt-1.5">{new Date(m.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {kinds[m.meeting_type]||'Meeting'}</p><span className={'inline-block text-[10px] font-semibold px-2 py-1 rounded-md mt-2 '+(m.summary?'bg-violet-50 text-violet-600':'bg-slate-100 text-slate-500')}>{m.summary?'Summary ready':'Notes saved'}</span></button>)}{!filtered.length&&<div className="px-4 py-10 text-center"><div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center" aria-hidden="true">✧</div><p className="text-sm font-semibold text-slate-700">{meetings.length?'No matching meetings':'A home for your conversations'}</p><p className="text-xs text-slate-400 leading-5 mt-2">{meetings.length?'Try another meeting title.':'Save your first set of notes to start your meeting history.'}</p></div>}</div>
   </aside>
   <div className="min-w-0 space-y-5">
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
     <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">{meetings.some(m=>m.id===id)?'Meeting workspace':'New conversation'}</h3><p className="text-xs text-slate-400 mt-1">Capture the details that matter.</p></div><span className="rounded-full bg-violet-50 text-violet-600 text-[11px] font-semibold px-3 py-1.5">{kinds[kind]}</span></div>
     <div className="p-5 sm:p-6 space-y-5"><div className="grid sm:grid-cols-3 gap-2" role="group" aria-label="Choose document type">{[{key:'client_intake',name:'Client intake brief',hint:'Role, requirements and next steps'},{key:'candidate_interview',name:'Candidate interview',hint:'Experience, evidence and questions'},{key:'internal_debrief',name:'Team debrief',hint:'Decisions, owners and actions'}].map(type=><button key={type.key} disabled={busy} aria-pressed={kind===type.key} onClick={()=>{setKind(type.key);setSummary('')}} className={'rounded-xl border p-3 text-left transition disabled:opacity-50 '+(kind===type.key?'bg-violet-50 border-violet-300 ring-1 ring-violet-100':'bg-white border-slate-200 hover:border-violet-200')}><span className="block text-xs font-semibold text-slate-800">{type.name}</span><span className="block text-[10px] text-slate-500 mt-1 leading-4">{type.hint}</span></button>)}</div>
      <label className="block text-xs font-semibold text-slate-600">Meeting title<input disabled={busy} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Staffing requirements with Example Foods" className={field}/></label>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-semibold text-slate-600">Conversation type<select disabled={busy} value={kind} onChange={e=>{setKind(e.target.value);setSummary('')}} className={field}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Linked contact <span className="font-normal text-slate-400">(optional)</span><select disabled={busy} value={contactId} onChange={e=>setContactId(e.target.value)} className={field}><option value="">Choose a CRM contact</option>{contacts.map(c=><option key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}: {c.company}</option>)}</select></label></div>
      {AUDIO_UPLOADS_ENABLED ? (<div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5"><div className="flex flex-wrap justify-between items-start gap-3"><div><h4 className="text-sm font-bold text-violet-900">Start with a recording</h4><p className="text-xs text-violet-600 mt-1">Upload audio to turn your conversation into editable notes.</p></div><span className="text-[10px] font-semibold bg-white rounded-full px-2.5 py-1 text-violet-700">1 Meet credit</span></div><label className="block mt-4 text-xs font-semibold text-slate-600">Audio file<input key={audioInputKey} disabled={busy} type="file" accept=".mp3,.m4a,.wav,.webm,.ogg,.flac,.mp4" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&(file.size>24*1024*1024||file.size===0||!/\.(mp3|m4a|wav|webm|ogg|flac|mp4)$/i.test(file.name))){setMessage('Choose a supported audio file up to 24 MB.');setAudioFile(null);e.target.value='';return}setAudioFile(file);setMessage('')}} className="block mt-2 w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2.5 file:font-semibold file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50"/></label><div className="flex flex-wrap gap-3 justify-between items-center mt-4"><p className="text-[11px] text-slate-500">MP3, M4A, WAV, WebM, OGG, FLAC or MP4 · Up to 24 MB</p><button disabled={busy||!audioFile} onClick={transcribeAudio} className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-xs font-semibold hover:bg-violet-700 disabled:opacity-50">{audioStage||'Transcribe audio (1 credit)'}</button></div><p className="text-[11px] text-slate-500 mt-3 leading-5">Your recording is sent for AI transcription. Each transcription attempt uses 1 Meet credit. Generate summary is a separate 1-credit action.</p>{audioStage&&<p role="status" className="mt-2 text-xs font-semibold text-violet-700">{audioStage}</p>}</div>) : (
       <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-bold text-violet-900">Audio uploads</h4><span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">Coming soon</span></div><p className="mt-2 text-xs leading-5 text-slate-500">Turn recordings into editable notes. For now, paste your notes or a meeting transcript below to generate your recruiter document.</p></div>
      )}
      <label className="block text-xs font-semibold text-slate-600">Conversation notes<textarea disabled={busy} value={notes} maxLength={40000} onChange={e=>{setNotes(e.target.value);setSummary('')}} rows={10} placeholder="What did you discuss? Paste a transcript or write your notes here.\n\nInclude requirements, decisions, and anything to follow up on." className={field+' resize-y leading-7 font-normal min-h-[240px]'}/></label>
      <div className="flex justify-between text-[11px] text-slate-400 gap-3"><span>Written notes or pasted transcripts</span><span>{notes.length.toLocaleString()} / 40,000</span></div>
     </div>
     <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap justify-between items-center gap-4"><p className="text-xs text-slate-500">Save notes free.<br/><span className="text-[11px] text-slate-400">AI summary uses 1 summary credit.</span></p><div className="flex flex-wrap gap-2"><button disabled={busy||!title.trim()||!notes.trim()||notes.length>40000} onClick={()=>save('save')} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Save notes</button><button disabled={busy||!title.trim()||!notes.trim()||notes.length>40000} onClick={()=>save('summarize')} className="bg-violet-600 text-white rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm hover:bg-violet-700 disabled:opacity-50">{busy?'Working…':'✧ Generate summary'}</button></div></div>
    </div>
    <div className="border border-violet-100 rounded-2xl bg-white shadow-sm overflow-hidden"><div className="px-5 sm:px-6 py-4 bg-violet-50/60 flex justify-between items-center gap-3"><h3 className="font-bold text-sm text-violet-900">{kind==='client_intake'?'Client intake brief':kind==='candidate_interview'?'Candidate interview notes':'Internal debrief summary'}</h3>{summary&&<button onClick={printSummary} className="text-violet-700 text-xs font-semibold hover:underline">Print / PDF</button>}{summary&&<button onClick={()=>navigator.clipboard.writeText(summary).then(()=>setMessage('Summary copied.')).catch(()=>setMessage('Copy unavailable. Select the summary text to copy.'))} className="text-violet-700 text-xs font-semibold hover:underline">Copy summary</button>}</div>{summary?<div className="break-words text-sm text-slate-600 leading-7 p-5 sm:p-6">{summary.split('\n').map((line,i)=>/^#{1,3} |^\*\*[^*]+\*\*:??$/.test(line.trim())?<h4 key={i} className="text-sm font-bold text-slate-900 mt-5 mb-2 first:mt-0">{line.replace(/^#+\s*|\*\*/g,'')}</h4>:<p key={i} className={line.trim()?'mb-1 whitespace-pre-wrap':'h-2'}>{line.replace(/\*\*([^*]+)\*\*/g,'$1')}</p>)}</div>:<div className="p-6 text-center"><p className="text-sm font-medium text-slate-600">Turn your notes into clear next steps</p><p className="text-xs text-slate-400 mt-2">Add your notes, then generate a summary to review here.</p></div>}</div>
   </div>
  </div>
 </section>
}
