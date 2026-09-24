import { createClient } from '@supabase/supabase-js'
import { companyKey, approvalError } from './company-pattern-review'
import { identifyEmailPattern, normalizeDomain } from './email-patterns'
export function companyService(){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.NEXT_PUBLIC_SUPABASE_URL)return null
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(2000)})}})
}
export async function approvedCompanyPattern(company:string,domain:string){
 try{
  const db=companyService();if(!db)return null
  let query=db.from('company_directory').select('*').eq('status','approved').eq('domain_confirmed',true).gt('expires_at',new Date().toISOString())
  query=domain?query.eq('domain',domain):query.contains('aliases',[companyKey(company)])
  const {data,error}=await query.limit(2)
  if(error||data?.length!==1)return null
  const row=data[0]
  const {data:evidence,error:evidenceError}=await db.from('company_pattern_evidence').select('*').eq('company_id',row.id)
  if(evidenceError||approvalError(row,evidence||[]))return null
  return {domain:row.domain,pattern:row.pattern,evidence:'Observed company pattern. Inbox not verified.'}
 }catch{return null}
}
export async function recordCompanySearch(event:{company:string;domain:string;apiCalled:boolean;result:boolean}){
 try{const db=companyService();if(!db||!event.company&&!event.domain)return
  if(!event.domain&&event.company){
    const {data}=await db.from('company_directory').select('domain').eq('domain_confirmed',true).contains('aliases',[companyKey(event.company)]).limit(2)
    if(data?.length===1)event.domain=data[0].domain
  }
  const key=event.domain?'domain:'+event.domain:'name:'+companyKey(event.company)
  const {error}=await db.rpc('record_company_search',{p_key:key,p_name:event.company||event.domain,p_domain:event.domain,p_api:event.apiCalled,p_result:event.result})
  if(error)console.warn('Company search metrics unavailable')
 }catch{console.warn('Company search metrics unavailable')}
}

type ProviderSource = { uri?: unknown }
export async function approvePatternConsensus(db:any,company:any):Promise<boolean>{
 try{
  if(!company?.id||company.status==='paused')return false
  const {data:evidence,error}=await db.from('company_pattern_evidence').select('*').eq('company_id',company.id)
  if(error||approvalError(company,evidence||[]))return false
  const now=Date.now(),dates=(evidence||[]).filter((item:any)=>!item.excluded).map((item:any)=>Date.parse(item.observed_at)+90*86400000).filter((date:number)=>date>now)
  const expires=new Date(Math.min(now+90*86400000,...dates)).toISOString()
  const result=await db.from('company_directory').update({status:'approved',approved_at:new Date(now).toISOString(),expires_at:expires,updated_at:new Date(now).toISOString()}).eq('id',company.id)
  return !result.error
 }catch{return false}
}
export async function recordProviderPatternEvidence(input:{
 company:string;domain:string;firstName:string;lastName:string;email:string;sources:ProviderSource[];provider?:'hunter'|'exa'|'apollo'
}):Promise<boolean>{
 try{
  const db=companyService();if(!db)return false
  const domain=normalizeDomain(input.domain||input.email.split('@')[1]||'')
  const email=input.email.trim().toLowerCase()
  if(!domain||email.split('@')[1]!==domain)return false
  const pattern=identifyEmailPattern(input.firstName,input.lastName,email,domain)
  if(!pattern)return false
  const officialSource=input.sources.map(s=>typeof s?.uri==='string'?s.uri:'').find(uri=>{
   const sourceDomain=normalizeDomain(uri)
   return sourceDomain===domain||sourceDomain.endsWith('.'+domain)
  })
  const source=officialSource||(input.provider==='hunter'?'https://hunter.io':input.provider==='apollo'?'https://app.apollo.io':'')
  if(!source)return false
  const sourceType=officialSource?'official_website':'provider_candidate'
  const alias=companyKey(input.company||domain)
  let {data:company}=await db.from('company_directory').select('*').eq('domain',domain).maybeSingle()
  if(!company){
   const created=await db.from('company_directory').insert({
    name:(input.company||domain).slice(0,250),domain,aliases:alias?[alias]:[],country:'',industry:'',
    website:officialSource?new URL(source).origin:'https://'+domain,domain_confirmed:false,pattern,status:'needs_evidence',updated_at:new Date().toISOString(),
   }).select('*').single()
   if(created.error){const retry=await db.from('company_directory').select('*').eq('domain',domain).maybeSingle();company=retry.data}
   else company=created.data
  }else{
   const aliases=Array.from(new Set([...(company.aliases||[]),...(alias?[alias]:[])]))
   const patch:any={aliases,updated_at:new Date().toISOString()}
   const {data:priorEvidence,error:priorEvidenceError}=await db.from('company_pattern_evidence').select('first_name,last_name,email,source_type,reuse_confirmed,excluded').eq('company_id',company.id)
   const active=(priorEvidence||[]).filter((item:any)=>!item.excluded)
   const hasReusableEvidence=active.some((item:any)=>item.reuse_confirmed&&['official_website','licensed_data'].includes(item.source_type))
   const observedPatterns=active.map((item:any)=>identifyEmailPattern(item.first_name,item.last_name,item.email,domain)).filter(Boolean)
   // Provider research may correct a placeholder pattern while the company is still unapproved.
   // It must never override a pattern supported by reusable evidence.
   if(!priorEvidenceError&&company.status!=='approved'&&!hasReusableEvidence&&observedPatterns.every((value:any)=>value===pattern))patch.pattern=pattern
   const updated=await db.from('company_directory').update(patch).eq('id',company.id)
   if(updated.error)return false
   company={...company,...patch}
  }
  if(!company?.id)return false
  const {data:existing}=await db.from('company_pattern_evidence').select('source_type').eq('company_id',company.id).eq('email',email).maybeSingle()
  if(!existing?.source_type){
   const saved=await db.from('company_pattern_evidence').upsert({
    company_id:company.id,first_name:input.firstName.slice(0,100),last_name:input.lastName.slice(0,100),email,
    source_url:source.slice(0,2000),source_type:sourceType,observed_at:new Date().toISOString(),
    reuse_confirmed:false,excluded:false,
   },{onConflict:'company_id,email'})
   if(saved.error)return false
  }
  await approvePatternConsensus(db,company)
  return true
 }catch{console.warn('Provider pattern evidence could not be queued for review');return false}
}

export async function backfillProviderPatternCandidates(limit=1000){
 const db=companyService();if(!db)return {processed:0,error:'Company Data is unavailable.'}
 const {data,error}=await db.from('email_resolutions').select('identity_key,email,source,created_at').eq('source','hunter_finder').order('created_at',{ascending:false}).limit(Math.min(1000,Math.max(1,limit)))
 if(error)return {processed:0,error:'Could not read saved provider results.'}
 let processed=0
 for(const row of data||[]){
  try{
   const identity=JSON.parse(row.identity_key)
   if(!Array.isArray(identity))continue
   const [firstName,lastName,company,requestedDomain]=identity.map(value=>typeof value==='string'?value:'')
   const domain=normalizeDomain(requestedDomain||String(row.email||'').split('@')[1]||'')
   if(!firstName||!lastName||!domain)continue
   await recordProviderPatternEvidence({company,domain,firstName,lastName,email:String(row.email||''),sources:[],provider:'hunter'})
   processed++
  }catch{}
 }
 return {processed,error:null}
}
