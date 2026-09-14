import { normalizeDomain, normalizeName, predictEmail, isFresh } from './email-patterns'
export const COMPANY_PATTERNS=['{first}.{last}','{first}{last}','{f}{last}','{first}_{last}','{first}','{last}{first}','{first}{l}','{last}.{first}']
export const companyKey=(name:string)=>name.trim().toLowerCase().replace(/\s+/g,' ').slice(0,250)
export function publicSource(value:string):boolean {try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!!normalizeDomain(u.hostname)&&!u.username&&!u.password}catch{return false}}
export function approvalError(company:any,evidence:any[]):string|null {
 if(!company.domain_confirmed||!company.domain||normalizeDomain(company.website)!==company.domain)return 'Confirm the official company website and domain first.'
 if(!COMPANY_PATTERNS.includes(company.pattern))return 'Choose a supported employee email pattern.'
 const eligible=evidence.filter(e=>!e.excluded&&e.reuse_confirmed&&isFresh(e.observed_at,90)&&publicSource(e.source_url)&&['official_website','licensed_data'].includes(e.source_type))
 const people=new Set<string>(),emails=new Set<string>()
 for(const e of eligible){
  if(!normalizeName(e.first_name)||!normalizeName(e.last_name))return 'Evidence must identify a named employee.'
  if(e.source_type==='official_website'&&normalizeDomain(e.source_url)!==company.domain)return 'Official website evidence must come from the confirmed domain.'
  const expected=predictEmail(e.first_name,e.last_name,company.domain,company.pattern)
  if(expected!==e.email.toLowerCase())return 'Evidence conflicts with this pattern. Review or exclude the conflicting example before approval.'
  people.add(normalizeName(e.first_name)+'|'+normalizeName(e.last_name));emails.add(e.email.toLowerCase())
 }
 if(people.size<2||emails.size<2)return 'Add at least two distinct named employee examples observed in the last 90 days, with reuse rights confirmed.'
 return null
}
