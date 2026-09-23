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
export async function recordProviderPatternEvidence(input:{
 company:string;domain:string;firstName:string;lastName:string;email:string;sources:ProviderSource[]
}){
 try{
  const db=companyService();if(!db)return
  const domain=normalizeDomain(input.domain||input.email.split('@')[1]||'')
  const email=input.email.trim().toLowerCase()
  if(!domain||email.split('@')[1]!==domain)return
  const pattern=identifyEmailPattern(input.firstName,input.lastName,email,domain)
  if(!pattern)return
  const source=input.sources.map(s=>typeof s?.uri==='string'?s.uri:'').find(uri=>normalizeDomain(uri)===domain)
  if(!source)return
  const alias=companyKey(input.company||domain)
  let {data:company}=await db.from('company_directory').select('*').eq('domain',domain).maybeSingle()
  if(!company){
   const created=await db.from('company_directory').insert({
    name:(input.company||domain).slice(0,250),domain,aliases:alias?[alias]:[],country:'',industry:'',
    website:new URL(source).origin,domain_confirmed:false,pattern,status:'needs_evidence',updated_at:new Date().toISOString(),
   }).select('*').single()
   if(created.error){const retry=await db.from('company_directory').select('*').eq('domain',domain).maybeSingle();company=retry.data}
   else company=created.data
  }else{
   const aliases=Array.from(new Set([...(company.aliases||[]),...(alias?[alias]:[])]))
   const patch:any={aliases,updated_at:new Date().toISOString()}
   if(!company.pattern)patch.pattern=pattern
   await db.from('company_directory').update(patch).eq('id',company.id)
  }
  if(!company?.id)return
  await db.from('company_pattern_evidence').upsert({
   company_id:company.id,first_name:input.firstName.slice(0,100),last_name:input.lastName.slice(0,100),email,
   source_url:source.slice(0,2000),source_type:'official_website',observed_at:new Date().toISOString(),
   reuse_confirmed:false,excluded:false,
  },{onConflict:'company_id,email',ignoreDuplicates:true})
 }catch{console.warn('Provider pattern evidence could not be queued for review')}
}
