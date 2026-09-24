import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { approvePatternConsensus, backfillProviderPatternCandidates, companyService, recordProviderPatternEvidence } from '@/lib/company-data'
import { COMPANY_PATTERNS,companyKey,approvalError,publicSource } from '@/lib/company-pattern-review'
import { identifyEmailPattern, normalizeDomain } from '@/lib/email-patterns'
import { apolloResearchConfigured, researchWorkEmailWithApollo } from '@/lib/apollo-research'
import { releaseProviderCredit, reserveProviderCredit } from '@/lib/provider-budget'
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
 const requestedDomains=Array.from(new Set<string>((q.data||[]).map((item:any)=>normalizeDomain(item.requested_domain||'')).filter(Boolean)))
 const requestedAliases=Array.from(new Set<string>((q.data||[]).flatMap((item:any)=>{const alias=companyKey(item.company_name||'');return alias?[alias,alias.replace(/-/g,'‑')]:[]})))
 const [domainMatches,aliasMatches]=await Promise.all([
  requestedDomains.length?db!.from('company_directory').select('*').eq('domain_confirmed',true).in('domain',requestedDomains):{data:[],error:null},
  requestedAliases.length?db!.from('company_directory').select('*').eq('domain_confirmed',true).overlaps('aliases',requestedAliases):{data:[],error:null},
 ])
 if(domainMatches.error||aliasMatches.error)return fail('Company request matching is unavailable.',503)
 const byDomain=new Map((domainMatches.data||[]).map((company:any)=>[company.domain,company]))
 const byAlias=new Map<string,any>()
 for(const company of aliasMatches.data||[])for(const alias of company.aliases||[])byAlias.set(companyKey(alias),company)
 const groupedQueue=new Map<string,any>()
 for(const request of q.data||[]){
  const matched=byDomain.get(normalizeDomain(request.requested_domain||''))||byAlias.get(companyKey(request.company_name||''))
  const key=matched?'company:'+matched.id:request.company_key
  const existing=groupedQueue.get(key)
  if(existing){for(const field of ['requests','api_calls','api_avoided','results'])existing[field]=Number(existing[field]||0)+Number(request[field]||0);if(Date.parse(request.last_requested_at)>Date.parse(existing.last_requested_at))existing.last_requested_at=request.last_requested_at}
  else groupedQueue.set(key,{...request,...(matched?{company_key:key,company_name:matched.name,requested_domain:matched.domain,resolved_company:matched}:{})})
 }
 const queue=Array.from(groupedQueue.values()).sort((a:any,b:any)=>Number(b.requests)-Number(a.requests))
 const ids=(d.data||[]).map((company:any)=>company.id)
 const evidence=ids.length?await db!.from('company_pattern_evidence').select('company_id,source_type,reuse_confirmed,excluded').in('company_id',ids):{data:[],error:null}
 if(evidence.error)return fail('Company evidence summary is unavailable.',503)
 const counts=new Map<string,{candidates:number;qualifying:number}>()
 for(const item of evidence.data||[]){
  if(item.excluded)continue
  const current=counts.get(item.company_id)||{candidates:0,qualifying:0}
  if(item.source_type==='provider_candidate')current.candidates++
  if(item.reuse_confirmed&&['official_website','licensed_data'].includes(item.source_type))current.qualifying++
  counts.set(item.company_id,current)
 }
 const companies=(d.data||[]).map((company:any)=>({...company,research_candidates:counts.get(company.id)?.candidates||0,qualifying_evidence:counts.get(company.id)?.qualifying||0}))
 return NextResponse.json({companies,total:d.count,queue,stats:stats.data})
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
   const {data,error}=await auth.db.from('contacts').select('company').eq('user_id',auth.user.id).is('deleted_at',null).range(offset,offset+499)
   if(error)return fail('Could not read CRM company names.',503)
   const unique=new Map<string,any>();for(const c of data||[]){if(c.company?.trim()){const key='name:'+companyKey(c.company);unique.set(key,{company_key:key,company_name:c.company.trim().slice(0,250)})}}
   if(unique.size){const result=await db.from('company_requests').upsert(Array.from(unique.values()),{onConflict:'company_key',ignoreDuplicates:true});if(result.error)return fail('Could not seed the queue.',503);count+=unique.size}
   if(!data||data.length<500)break
  }
  return NextResponse.json({message:'CRM company names added to the queue. Existing entries and demand counts preserved.',processed:count})
 }
 if(b.action==='backfill-provider-candidates'){
  const result=await backfillProviderPatternCandidates()
  return result.error?fail(result.error,503):NextResponse.json({message:`Processed ${result.processed} historical Hunter results as unapproved pattern candidates.`,processed:result.processed})
 }
 if(b.action==='confirm-pattern-consensus'){
  const {data,error}=await db.from('company_directory').select('*').eq('status','needs_evidence').eq('domain_confirmed',true).limit(1000)
  if(error)return fail('Could not review matching company patterns.',503)
  let confirmed=0
  for(const company of data||[])if(await approvePatternConsensus(db,company))confirmed++
  return NextResponse.json({message:confirmed?`Confirmed ${confirmed} matching company pattern${confirmed===1?'':'s'}.`:'Company patterns are up to date.',confirmed})
 }
 if(b.action==='save'){
  const name=typeof b.name==='string'?b.name.trim().slice(0,250):'',domain=normalizeDomain(b.domain||'')
  if(!name||!domain||!publicSource(b.website||''))return fail('Enter a company name, work-email domain and official website URL.')
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
 if(b.action==='save-apollo-candidate'){
  const first=String(b.firstName||'').trim().slice(0,100),last=String(b.lastName||'').trim().slice(0,100)
  const email=String(b.email||'').trim().toLowerCase(),domain=normalizeDomain(company.domain||'')
  if(!first||!last||!domain||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||normalizeDomain(email.split('@')[1]||'')!==domain||b.ownerConfirmed!==true)return fail('Enter the employee name and a same-domain work email, then confirm it came from your Apollo workspace.')
  const detectedPattern=identifyEmailPattern(first,last,email,domain)
  if(!detectedPattern)return fail('This Apollo address does not match one of Hirely’s supported company patterns.')
  const saved=await recordProviderPatternEvidence({company:company.name,domain,firstName:first,lastName:last,email,sources:[],provider:'apollo'})
  if(!saved)return fail('The Apollo candidate could not be saved. Check that the address matches a supported company pattern.',503)
  const refreshed=await db.from('company_directory').select('*').eq('id',b.id).single()
  return NextResponse.json({message:`Saved Apollo result. Detected pattern: ${detectedPattern}. Two distinct matching employees automatically confirm the company pattern.`,found:true,email,pattern:detectedPattern,company:refreshed.data||company})
 }
 if(b.action==='research-apollo'){
  const first=String(b.firstName||'').trim().slice(0,100),last=String(b.lastName||'').trim().slice(0,100)
  const linkedinUrl=String(b.linkedinUrl||'').trim().slice(0,1000)
  if(!first||!last||!normalizeDomain(company.domain||''))return fail('Enter the employee first and last name and save a company domain first.')
  if(linkedinUrl){
   try{const url=new URL(linkedinUrl);if(url.protocol!=='https:'||!/(^|\.)linkedin\.com$/.test(url.hostname)||!url.pathname.startsWith('/in/'))return fail('Use a valid HTTPS LinkedIn profile URL, or leave it blank.')}
   catch{return fail('Use a valid HTTPS LinkedIn profile URL, or leave it blank.')}
  }
  if(!apolloResearchConfigured())return fail('Apollo owner research is not configured. Add the server-only API key and a positive monthly limit.',503)
  const reservation=await reserveProviderCredit('apollo')
  if(reservation==='unavailable')return fail('Apollo spending controls are unavailable. Apply the Apollo migration first.',503)
  if(reservation==='exhausted')return fail('Apollo research allowance reached for this billing cycle.',503)
  let consumed=false
  try{
   const result=await researchWorkEmailWithApollo({firstName:first,lastName:last,company:company.name,domain:company.domain,linkedinUrl:linkedinUrl||undefined})
   consumed=result.billable
   if(result.kind!=='found'||!result.email){
    const reason=result.reason==='low_confidence'?'Apollo found only a low-confidence match.':result.reason==='unverified'?'Apollo did not return a verified work email.':result.reason==='wrong_domain'?'Apollo returned an address for a different company domain.':'Apollo found no matching work email.'
    return NextResponse.json({message:reason+' Nothing was added to the shared pattern database.',found:false})
   }
   const saved=await recordProviderPatternEvidence({company:company.name,domain:company.domain,firstName:first,lastName:last,email:result.email,sources:[],provider:'apollo'})
   if(!saved)return fail('Apollo found an address, but the review candidate could not be saved.',503)
   return NextResponse.json({message:'Apollo found a verified work address and saved it as an owner-only provider candidate. It cannot serve customer searches or qualify for approval.',found:true,email:result.email})
  }catch{return fail('Apollo research failed. No automatic retry was made.',502)}
  finally{if(!consumed)await releaseProviderCredit('apollo').catch(()=>{})}
 }
 if(b.action==='evidence'){
  const first=String(b.firstName||'').trim().slice(0,100),last=String(b.lastName||'').trim().slice(0,100),email=String(b.email||'').trim().toLowerCase()
  const source=String(b.sourceUrl||'').trim(),observed=new Date(b.observedAt)
  if(!first||!last||!/^([^\s@]+)@([^\s@]+)$/.test(email)||email.split('@')[1]!==company.domain||!publicSource(source)||!['official_website','licensed_data'].includes(b.sourceType)||b.reuseConfirmed!==true||!Number.isFinite(observed.getTime())||observed.getTime()>Date.now())return fail('Provide a named employee, same-domain email, source URL, valid observation date and confirmed reuse rights.')
  if(b.sourceType==='official_website'){
   const sourceDomain=normalizeDomain(source),websiteDomain=normalizeDomain(company.website||'')
   if(![company.domain,websiteDomain].some(domain=>domain&&(sourceDomain===domain||sourceDomain.endsWith('.'+domain))))return fail('Use an official source on the confirmed website or email domain, or select licensed data.')
  }
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
 if(b.action==='confirm-reuse'){
  const {data:evidence,error}=await db.from('company_pattern_evidence').select('*').eq('id',b.evidenceId).eq('company_id',b.id).single()
  if(error||!evidence)return fail('Evidence not found.',404)
  if(evidence.source_type==='provider_candidate')return fail('Provider candidates cannot be approved directly. Confirm your provider reuse rights, then add this address as Licensed data with reuse rights.')
  if(!publicSource(evidence.source_url))return fail('Review the source URL before confirming reuse.')
  if(evidence.source_type==='official_website'){
   const sourceDomain=normalizeDomain(evidence.source_url),websiteDomain=normalizeDomain(company.website||'')
   if(![company.domain,websiteDomain].some(domain=>domain&&(sourceDomain===domain||sourceDomain.endsWith('.'+domain))))return fail('Review the source URL and confirmed company domains before confirming reuse.')
  }
  const paused=await db.from('company_directory').update({status:'needs_evidence',expires_at:null,updated_at:new Date().toISOString()}).eq('id',b.id)
  if(paused.error)return fail('Could not invalidate approval.',503)
  const result=await db.from('company_pattern_evidence').update({reuse_confirmed:b.confirmed===true}).eq('id',b.evidenceId).eq('company_id',b.id)
  return result.error?fail('Could not update reuse review.',503):NextResponse.json({message:b.confirmed?'Evidence confirmed for shared pattern review.':'Evidence marked as awaiting reuse review.'})
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
