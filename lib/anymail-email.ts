import { normalizeDomain } from './email-patterns'

export type AnymailResult =
  | { kind: 'found'; email: string; domain: string; creditsCharged: number }
  | { kind: 'none'; creditsCharged: number }

export function anymailEmailSearchConfigured(): boolean {
  return !!process.env.ANYMAIL_FINDER_API_KEY && Number(process.env.ANYMAIL_FINDER_CREDIT_LIMIT || 0) > 0
}

export async function findVerifiedEmailWithAnymail(input: {
  firstName: string
  lastName: string
  company: string
  domain: string
}): Promise<AnymailResult> {
  const key = process.env.ANYMAIL_FINDER_API_KEY
  if (!key) throw new Error('Anymail Finder is not configured')

  const requestedDomain = normalizeDomain(input.domain)
  const payload = requestedDomain
    ? { domain: requestedDomain, first_name: input.firstName, last_name: input.lastName }
    : { company_name: input.company, first_name: input.firstName, last_name: input.lastName }
  const response = await fetch('https://api.anymailfinder.com/v5.1/find-email/person', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) throw new Error('Anymail Finder request failed')

  const data = await response.json()
  const creditsCharged = Number.isFinite(Number(data?.credits_charged))
    ? Math.max(0, Math.floor(Number(data.credits_charged)))
    : 0
  const email = typeof data?.valid_email === 'string' ? data.valid_email.trim().toLowerCase() : ''
  if (data?.email_status !== 'valid' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: 'none', creditsCharged }
  }
  const resolvedDomain = normalizeDomain(email.split('@')[1] || '')
  if (!resolvedDomain || (requestedDomain && resolvedDomain !== requestedDomain)) {
    return { kind: 'none', creditsCharged }
  }
  return { kind: 'found', email, domain: resolvedDomain, creditsCharged }
}
