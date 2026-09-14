import { createClient } from '@supabase/supabase-js'
import { companyKey, approvalError } from './company-pattern-review'
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
