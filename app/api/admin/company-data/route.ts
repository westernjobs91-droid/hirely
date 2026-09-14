import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { companyService } from '@/lib/company-data'
import { COMPANY_PATTERNS,companyKey,approvalError,publicSource } from '@/lib/company-pattern-review'
import { normalizeDomain } from '@/lib/email-patterns'
export const dynamic='force-dynamic'
async function admin(request:Request){
 const auth=await authenticate(request)
 if(!auth)return {error:NextResponse.json({error:'Sign in to Hirely.'},{status:401})}
 const allowed=(process.env.HIRELY_ADMIN_EMAILS||'growwithjey@gmail.com').split(',').map(v=>v.trim().toLowerCase())
 if(!allowed.includes(auth.user.email?.toLowerCase()||''))return {error:NextResponse.json({error:'Admin access required.'},{status:403})}
 const db=companyService();if(!db)return {error:NextResponse.json({error:'Company Data needs the server service-role key.'},{status:503})}
 return {db,auth}
}
const fail=(error:string,status=400)=>NextResponse.json({error},{status})
export async function GET(request:Request){
 const a=await admin(request);if(a.error)return a.error
 const {db}=a
 const url=new URL(request.url),id=url.searchParams.get('id')
 if(id){const {data,error}=await db!.from('company_pattern_evidence').select('*').eq('company_id',id).order('observed_at',{ascending:false});return error?fail('Evidence storage unavailable. Apply the migration.',503):NextResponse.json({evidence:data})}
 const page=Math.min(20000,Math.max(0,Math.floor(Number(url.searchParams.get('page'))||0))),search=(url.searchParams.get('search')||'').trim().slice(0,150),filter=url.searchParams.get('filter')||'all'
 let directory=db!.from('company_directory').select('*',{count:'exact'}).order('updated_at',{ascending:false})
 if(search)directory=directory.ilike('name','%'+search.replace(/[%_]/g,'')+'%')
 if(filter==='canada')directory=directory.eq('country','CA')
 if(filter==='review')directory=directory.neq('status','approved')
 if(filter==='supported')directory=directory.eq('status','approved').gt('expires_at',new Date().toISOString())
 const [d,q,stats]=await Promise.all([directory.range(page*50,page*50+49),db!.from('company_requests').select('*').order('requests',{ascending:false}).limit(100),db!.rpc('company_data_stats')])
 if(d.error||q.error||stats.error)return fail('Company Data storage unavailable. Apply the company data migration.',503)
 return NextResponse.json({companies:d.data,total:d.count,queue:q.data,stats:stats.data})
}
export async function POST(request:Request){
 const a=await admin(request);if(a.error)return a.error
 const db=a.db!,auth=a.auth!
 let b:any;try{b=await request.json()}catch{return fail('Invalid request')}
 if(!b||typeof b!=='object')return fail('Invalid request')
 if(b.action==='seed'){
  let count=0
  // Seed only the signed-in administrator's CRM. No employee names or emails are copied.
  for(let offset=0;offset<10000;offset+=500){
   const {data,error}=await auth.db.from('contacts').select('company').eq('user_id',auth.user.id).range(offset,offset+499)
   if(error)return fail('Could not read CRM company names.',503)
   const unique=new Map<string,any>();for(const c of data||[]){if(c.company?.trim()){const key='name:'+companyKey(c.company);unique.set(key,{company_key:key,company_name:c.company.trim().slice(0,250)})}}
   if(unique.size){const result=await db.from('company_requests').upsert(Array.from(unique.values()),{onConflict:'company_key',ignoreDuplicates:true});if(result.error)return fail('Could not seed the queue.',503);count+=unique.size}
   if(!data||data.length<500)break
  }
  return NextResponse.json({message:'CRM company names added to the queue. Existing entries and demand counts preserved.',processed:count})
 }
 if(b.action==='save'){
  const name=typeof b.name==='string'?b.name.trim().slice(0,250):'',domain=normalizeDomain(b.domain||'')
  if(!name||!domain||!publicSource(b.website||'')||normalizeDomain(b.website)!==domain)return fail('Enter a company name, domain and matching official website URL.')
  const aliases=Array.from(new Set<string>([companyKey(name),...(Array.isArray(b.aliases)?b.aliases.filter((v:any)=>typeof v==='string').slice(0,30).map(companyKey):[])]))
  const payload={name,domain,website:b.website.slice(0,1000),aliases,country:b.country==='CA'?'CA':String(b.country||'').slice(0,2).toUpperCase(),industry:String(b.industry||'').slice(0,150),domain_confirmed:b.domainConfirmed===true,pattern:COMPANY_PATTERNS.includes(b.pattern)?b.pattern:null,status:'needs_evidence',expires_at:null,approved_at:null,updated_at:new Date().toISOString()}
  const result=b.id?await db.from('company_directory').update(payload).eq('id',b.id).select('*').single():await db.from('company_directory').insert(payload).select('*').single()
  if(result.error)return fail('Could not save. This domain may already exist.',409)
  if(payload.domain_confirmed){const merge=await db.rpc('merge_company_requests',{p_domain:domain,p_name:name,p_aliases:aliases});if(merge.error)return NextResponse.json({company:result.data,message:'Company saved, but request merging failed. Save again to retry.'})}
  return NextResponse.json({company:result.data,message:'Saved for evidence review. Any previous approval was cleared.'})
 }
 if(!b.id)return fail('Choose a company first.')
 const {data:company,error}=await db.from('company_directory').select('*').eq('id',b.id).single()
 if(error||!company)return fail('Company not found.',404)
 if(b.action==='evidence'){
  const first=String(b.firstName||'').trim().slice(0,100),last=String(b.lastName||'').trim().slice(0,100),email=String(b.email||'').trim().toLowerCase()
  const source=String(b.sourceUrl||'').trim(),observed=new Date(b.observedAt)
  if(!first||!last||!/^([^\s@]+)@([^\s@]+)$/.test(email)||email.split('@')[1]!==company.domain||!publicSource(source)||!['official_website','licensed_data'].includes(b.sourceType)||b.reuseConfirmed!==true||!Number.isFinite(observed.getTime())||observed.getTime()>Date.now())return fail('Provide a named employee, same-domain email, source URL, valid observation date and confirmed reuse rights.')
  if(b.sourceType==='official_website'&&normalizeDomain(source)!==company.domain)return fail('Use an official source on the confirmed domain, or select licensed data.')
  const paused=await db.from('company_directory').update({status:'needs_evidence',expires_at:null,updated_at:new Date().toISOString()}).eq('id',b.id)
  if(paused.error)return fail('Could not invalidate approval.',503)
  const result=await db.from('company_pattern_evidence').upsert({company_id:b.id,first_name:first,last_name:last,email,source_url:source.slice(0,2000),source_type:b.sourceType,observed_at:observed.toISOString(),reuse_confirmed:true,excluded:false},{onConflict:'company_id,email'})
  return result.error?fail('Could not save evidence.',503):NextResponse.json({message:'Evidence saved. Review before approving.'})
 }
 if(b.action==='exclude'){
  const paused=await db.from('company_directory').update({status:'needs_evidence',expires_at:null}).eq('id',b.id);if(paused.error)return fail('Could not invalidate approval.',503)
  const result=await db.from('company_pattern_evidence').update({excluded:b.excluded===true}).eq('id',b.evidenceId).eq('company_id',b.id)
  return result.error?fail('Could not update evidence.',503):NextResponse.json({message:'Evidence updated. Approval cleared.'})
 }
 if(b.action==='approve'){
  const {data:evidence,error}=await db.from('company_pattern_evidence').select('*').eq('company_id',b.id)
  if(error)return fail('Could not read evidence.',503)
  const issue=approvalError(company,evidence||[]);if(issue)return fail(issue)
  const dates=(evidence||[]).filter(e=>!e.excluded&&e.reuse_confirmed).map(e=>Date.parse(e.observed_at)+90*86400000).filter(d=>d>Date.now())
  const expires=new Date(Math.min(Date.now()+90*86400000,...dates)).toISOString()
  const result=await db.from('company_directory').update({status:'approved',approved_at:new Date().toISOString(),expires_at:expires,updated_at:new Date().toISOString()}).eq('id',b.id)
  return result.error?fail('Approval could not be saved.',503):NextResponse.json({message:'Pattern approved. It remains a prediction, not mailbox verification.'})
 }
 if(b.action==='pause'){
  const result=await db.from('company_directory').update({status:'paused',expires_at:null,updated_at:new Date().toISOString()}).eq('id',b.id)
  return result.error?fail('Could not pause pattern.',503):NextResponse.json({message:'Pattern paused. It will no longer supply new predictions.'})
 }
 return fail('Invalid action')
}
