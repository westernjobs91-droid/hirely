import { identifyEmailPattern, normalizeDomain, normalizeName } from './email-patterns'

type ExaResult = { url?: unknown; text?: unknown; highlights?: unknown }

export type ExaPublishedEmail = {
  email: string
  domain: string
  pattern: string
  sourceUrl: string
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function sourceMatchesEmailDomain(sourceUrl: string, emailDomain: string): boolean {
  const sourceDomain = normalizeDomain(sourceUrl)
  return sourceDomain === emailDomain || sourceDomain.endsWith('.' + emailDomain)
}

function nearbyName(text: string, email: string, firstName: string, lastName: string): boolean {
  const index = text.toLowerCase().indexOf(email.toLowerCase())
  if (index < 0) return false
  const nearby = text.slice(Math.max(0, index - 500), Math.min(text.length, index + email.length + 500))
    .replace(EMAIL_PATTERN,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ')
  const first = normalizeName(firstName), last = normalizeName(lastName)
  if (!first || !last) return false
  const words=nearby.trim().split(/\s+/)
  return words.some((word,index)=>word===first&&words.slice(index+1,index+4).includes(last)
    ||word===last&&words[index+1]===first)
}

export function extractPublishedEmail(results: ExaResult[], input:{firstName:string;lastName:string;domain:string;company?:string}):ExaPublishedEmail|null {
  const requestedDomain = normalizeDomain(input.domain)
  const requestedCompany = normalizeName(input.company || '')
  const matches = new Map<string,ExaPublishedEmail>()
  for (const result of results) {
    if (typeof result?.url !== 'string') continue
    const content=typeof result.text==='string'?result.text:Array.isArray(result.highlights)?result.highlights.filter((value):value is string=>typeof value==='string').join('\n'):''
    if(!content)continue
    let url: URL
    try { url = new URL(result.url) } catch { continue }
    if (url.protocol !== 'https:') continue
    if (!requestedDomain && (!requestedCompany || !normalizeName(content + ' ' + url.hostname).includes(requestedCompany))) continue
    const emails = content.match(EMAIL_PATTERN) || []
    for (const raw of emails) {
      const email = raw.toLowerCase(), emailDomain = normalizeDomain(email.split('@')[1] || '')
      if (!emailDomain || requestedDomain && emailDomain !== requestedDomain) continue
      if (!sourceMatchesEmailDomain(result.url, emailDomain)) continue
      if (!nearbyName(content, email, input.firstName, input.lastName)) continue
      const pattern = identifyEmailPattern(input.firstName,input.lastName,email,emailDomain)
      if (!pattern) continue
      matches.set(email,{email,domain:emailDomain,pattern,sourceUrl:result.url})
    }
  }
  return matches.size === 1 ? Array.from(matches.values())[0] : null
}

export function exaEmailSearchConfigured():boolean {
  return !!process.env.EXA_API_KEY && Number(process.env.EXA_MONTHLY_REQUEST_LIMIT || 0) > 0
}

export async function findPublishedEmailWithExa(input:{firstName:string;lastName:string;company:string;domain:string}):Promise<ExaPublishedEmail|null> {
  const key = process.env.EXA_API_KEY
  if (!key) return null
  const domain = normalizeDomain(input.domain)
  const response = await fetch('https://api.exa.ai/search',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key},
    body:JSON.stringify({
      query:`"${input.firstName} ${input.lastName}" "${input.company || domain}" work email`,
      ...(domain?{includeDomains:[domain]}:{}),
      numResults:3,
      type:'auto',
      contents:{highlights:true},
    }),
    cache:'no-store',
    signal:AbortSignal.timeout(15000),
  })
  if (!response.ok) return null
  const body=await response.json()
  return extractPublishedEmail(Array.isArray(body?.results)?body.results:[],input)
}
