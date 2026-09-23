export type EmailStatus = 'unverified' | 'predicted' | 'valid' | 'invalid' | 'accept_all' | 'unknown'
export const SUPPORTED_EMAIL_PATTERNS = ['{first}.{last}','{first}{last}','{f}{last}','{first}_{last}','{first}','{last}{first}','{first}{l}','{last}.{first}'] as const
export function normalizeDomain(value: string): string {
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) ? host : ''
  } catch { return '' }
}
export function normalizeName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}
export function predictEmail(first: string, last: string, domain: string, pattern: string): string | null {
  const f = normalizeName(first), l = normalizeName(last), d = normalizeDomain(domain)
  if (!f || !d || (pattern.includes('{last}') && !l) || !pattern.includes('{')) return null
  const local = pattern.replaceAll('{first}', f).replaceAll('{last}', l).replaceAll('{f}', f[0]).replaceAll('{l}', l[0] || '')
  if (!/^[a-z][a-z0-9._-]{0,63}$/.test(local) || local.includes('..') || /[._-]$/.test(local)) return null
  return local + '@' + d
}
export function identifyEmailPattern(first: string, last: string, email: string, domain: string): string | null {
  const candidate = email.trim().toLowerCase()
  for (const pattern of SUPPORTED_EMAIL_PATTERNS) {
    if (predictEmail(first, last, domain, pattern) === candidate) return pattern
  }
  return null
}
export function isFresh(date: string | null | undefined, days = 90): boolean {
  const age = Date.now() - Date.parse(date || '')
  return Number.isFinite(age) && age >= 0 && age < days * 86400000
}
export function providerStatus(status: unknown): EmailStatus {
  return status === 'valid' || status === 'invalid' || status === 'accept_all' ? status : 'unknown'
}
