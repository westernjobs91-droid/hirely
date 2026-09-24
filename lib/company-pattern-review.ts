import { normalizeDomain, normalizeName, predictEmail, isFresh, SUPPORTED_EMAIL_PATTERNS } from './email-patterns'
export const COMPANY_PATTERNS=[...SUPPORTED_EMAIL_PATTERNS]
export const companyKey=(name:string)=>name.normalize('NFKC').trim().toLowerCase().replace(/[‐‑‒–—―﹘﹣－]/g,'-').replace(/\s+/g,' ').slice(0,250)
export function publicSource(value:string):boolean {try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!!normalizeDomain(u.hostname)&&!u.username&&!u.password}catch{return false}}
export function approvalError(company:any,evidence:any[]):string|null {
 if(!company.domain_confirmed||!company.domain||!publicSource(company.website))return 'Confirm the official company website and email domain first.'
 if(!COMPANY_PATTERNS.includes(company.pattern))return 'Choose a supported employee email pattern.'
 const websiteDomain=normalizeDomain(company.website)
 const eligible=evidence.filter(e=>!e.excluded&&isFresh(e.observed_at,90)&&publicSource(e.source_url)&&(e.source_type==='provider_candidate'||e.source_type==='official_website'||e.source_type==='licensed_data'&&e.reuse_confirmed))
 const people=new Set<string>(),emails=new Set<string>()
 for(const e of eligible){
  if(!normalizeName(e.first_name)||!normalizeName(e.last_name))return 'Evidence must identify a named employee.'
  if(e.source_type==='official_website'){
   const sourceDomain=normalizeDomain(e.source_url)
   const official=sourceDomain===company.domain||sourceDomain.endsWith('.'+company.domain)||sourceDomain===websiteDomain||sourceDomain.endsWith('.'+websiteDomain)
   if(!official)return 'Official website evidence must come from the confirmed website or email domain.'
  }
  const expected=predictEmail(e.first_name,e.last_name,company.domain,company.pattern)
  if(expected!==e.email.toLowerCase())return 'Evidence conflicts with this pattern. Review or exclude the conflicting example before approval.'
  people.add(normalizeName(e.first_name)+'|'+normalizeName(e.last_name));emails.add(e.email.toLowerCase())
 }
 if(people.size<2||emails.size<2)return 'Add at least two distinct recent employee examples that confirm the same pattern.'
 return null
}
