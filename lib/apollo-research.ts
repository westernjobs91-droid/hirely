import { normalizeDomain } from './email-patterns'

export type ApolloResearchResult = {
  kind: 'found' | 'none'
  email?: string
  billable: boolean
  reason?: 'no_match' | 'low_confidence' | 'unverified' | 'wrong_domain'
}

export function apolloResearchConfigured(): boolean {
  return !!process.env.APOLLO_API_KEY && Number(process.env.APOLLO_MONTHLY_CREDIT_LIMIT || 0) > 0
}

export async function researchWorkEmailWithApollo(input:{
  firstName:string
  lastName:string
  company:string
  domain:string
  linkedinUrl?:string
}):Promise<ApolloResearchResult> {
  const key=process.env.APOLLO_API_KEY
  const domain=normalizeDomain(input.domain)
  if(!key||!domain)return {kind:'none',billable:false,reason:'no_match'}

  const params=new URLSearchParams({
    first_name:input.firstName.trim().slice(0,100),
    last_name:input.lastName.trim().slice(0,100),
    organization_name:input.company.trim().slice(0,250),
    domain,
    reveal_personal_emails:'false',
    reveal_phone_number:'false',
    run_waterfall_email:'false',
    run_waterfall_phone:'false',
  })
  if(input.linkedinUrl)params.set('linkedin_url',input.linkedinUrl)

  const response=await fetch('https://api.apollo.io/api/v1/people/match?'+params,{
    method:'POST',
    headers:{accept:'application/json','Content-Type':'application/json','Cache-Control':'no-cache','x-api-key':key},
    body:'{}',
    cache:'no-store',
    signal:AbortSignal.timeout(15000),
  })
  if(!response.ok)throw new Error('Apollo request failed')
  const data=await response.json()
  const person=data?.person
  const confidence=String(data?.match_confidence||person?.match_confidence||'none').toLowerCase()
  const credits=typeof data?.credits_consumed==='number'?data.credits_consumed:null
  const billable=credits!==null?credits>0:!!person&&confidence!=='none'
  if(!person)return {kind:'none',billable,reason:'no_match'}
  if(confidence!=='high')return {kind:'none',billable,reason:'low_confidence'}

  const email=typeof person.email==='string'?person.email.trim().toLowerCase():''
  if(person.email_status!=='verified'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {kind:'none',billable,reason:'unverified'}
  const emailDomain=normalizeDomain(email.split('@')[1]||'')
  const employerDomain=normalizeDomain(person.organization?.primary_domain||'')
  if(emailDomain!==domain||employerDomain&&employerDomain!==domain)return {kind:'none',billable,reason:'wrong_domain'}
  return {kind:'found',email,billable:true}
}
