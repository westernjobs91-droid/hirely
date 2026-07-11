import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Service client (for cache reads/writes — bypasses RLS) ────────────────
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Cache key helpers ─────────────────────────────────────────────────────
function emailCacheKey(firstName: string, lastName: string, company: string) {
  return `${firstName.toLowerCase().trim()}|${(lastName || '').toLowerCase().trim()}|${company.toLowerCase().trim()}`
}

function companyCacheKey(companyName: string) {
  return companyName.toLowerCase().trim()
}

// ── Auth helper ───────────────────────────────────────────────────────────
async function getAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// ── Credit check ──────────────────────────────────────────────────────────
async function checkAndUseCredit(userId: string): Promise<{ allowed: boolean; used: number; limit: number; remaining: number; reason?: string }> {
  const { data, error } = await serviceClient().rpc('check_and_use_enrichment_credit', { user_id: userId })
  if (error) return { allowed: false, used: 0, limit: 0, remaining: 0, reason: 'credit_check_failed' }
  return data as { allowed: boolean; used: number; limit: number; remaining: number; reason?: string }
}

// ── Email cache ───────────────────────────────────────────────────────────
async function getEmailCache(key: string) {
  const { data } = await serviceClient()
    .from('email_cache')
    .select('*')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single()
  return data || null
}

async function setEmailCache(key: string, firstName: string, lastName: string, company: string, result: {
  email: string; source: string; guessed?: boolean; extra_data?: Record<string, unknown>
}) {
  await serviceClient().from('email_cache').upsert({
    cache_key: key,
    first_name: firstName,
    last_name: lastName,
    company,
    email: result.email,
    source: result.source,
    guessed: result.guessed || false,
    extra_data: result.extra_data || null,
    expires_at: '2099-01-01T00:00:00.000Z',
  }, { onConflict: 'cache_key' })
}

// ── Company cache ─────────────────────────────────────────────────────────
async function getCompanyCache(key: string) {
  const { data } = await serviceClient()
    .from('company_cache')
    .select('*')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single()
  return data || null
}

async function setCompanyCache(key: string, companyName: string, data: Record<string, unknown>) {
  await serviceClient().from('company_cache').upsert({
    cache_key: key,
    company_name: companyName,
    data,
    expires_at: '2099-01-01T00:00:00.000Z',
  }, { onConflict: 'cache_key' })
}

// ── Apollo org resolution ─────────────────────────────────────────────────
async function resolveOrganizationDomain(apolloKey: string, company: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.apollo.io/api/v1/mixed_companies/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Authorization: `Bearer ${apolloKey}` },
      body: JSON.stringify({ q_organization_name: company, page: 1, per_page: 1 })
    })
    if (!res.ok) return null
    const data = await res.json()
    const org = data?.organizations?.[0] || data?.accounts?.[0]
    return org?.primary_domain || org?.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || null
  } catch { return null }
}

// ── Apollo people match ───────────────────────────────────────────────────
async function apolloPeopleMatch(apolloKey: string, firstName: string, lastName: string, params: { organization_name?: string; domain?: string }) {
  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Authorization: `Bearer ${apolloKey}` },
    body: JSON.stringify({ first_name: firstName, last_name: lastName || '', reveal_personal_emails: false, ...params })
  })
  if (!res.ok) return {}
  try { return await res.json() } catch { return {} }
}

// ── Hunter helpers ────────────────────────────────────────────────────────
async function hunterDomainSearch(hunterKey: string, domainOrCompany: { domain?: string; company?: string }) {
  try {
    const params = new URLSearchParams({ api_key: hunterKey, limit: '1' })
    if (domainOrCompany.domain) params.set('domain', domainOrCompany.domain)
    else if (domainOrCompany.company) params.set('company', domainOrCompany.company)
    else return null
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params.toString()}`)
    const data = await res.json()
    return { pattern: data?.data?.pattern || null, domain: data?.data?.domain || domainOrCompany.domain || null }
  } catch { return null }
}

function buildEmailFromPattern(pattern: string, firstName: string, lastName: string, domain: string): string | null {
  if (!pattern || !domain) return null
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const last = (lastName || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!first) return null
  const local = pattern
    .replace(/\{first\}/g, first).replace(/\{last\}/g, last)
    .replace(/\{f\}/g, first[0] || '').replace(/\{l\}/g, last[0] || '')
  if (!local || local.includes('{')) return null
  return `${local}@${domain}`
}

async function hunterVerifyEmail(hunterKey: string, email: string) {
  try {
    const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`)
    const data = await res.json()
    return { status: data?.data?.status || null, score: data?.data?.score ?? null }
  } catch { return { status: null, score: null } }
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { firstName, lastName, company } = await req.json()
    if (!firstName || !company) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // ── Check email cache FIRST — no credit burned if cached ──────────────
    const eKey = emailCacheKey(firstName, lastName, company)
    const cachedEmail = await getEmailCache(eKey)
    if (cachedEmail) {
      console.log('[enrich] email cache hit:', eKey)
      return NextResponse.json({
        email: cachedEmail.email,
        enriched: true,
        source: cachedEmail.source,
        guessed: cachedEmail.guessed || false,
        fromCache: true,
        ...(cachedEmail.extra_data || {}),
      })
    }

    const hunterKey = process.env.HUNTER_API_KEY
    const apolloKey = process.env.APOLLO_API_KEY
    let resolvedDomain: string | null = null

    // ── Check company domain cache to skip Apollo org lookup ──────────────
    const cKey = companyCacheKey(company)
    const cachedCompany = await getCompanyCache(cKey)
    if (cachedCompany?.data?.domain) {
      resolvedDomain = cachedCompany.data.domain as string
      console.log('[enrich] company domain cache hit:', company, '->', resolvedDomain)
    }

    // ── Step 1: Apollo people match ───────────────────────────────────────
    if (apolloKey) {
      try {
        let apolloData: any = {}

        if (resolvedDomain) {
          apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { domain: resolvedDomain })
        } else {
          apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { organization_name: company })
          if (!apolloData?.person?.email) {
            resolvedDomain = await resolveOrganizationDomain(apolloKey, company)
            if (resolvedDomain) {
              // Cache the resolved domain for future lookups
              await setCompanyCache(cKey, company, { domain: resolvedDomain })
              apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { domain: resolvedDomain })
            }
          }
        }

        if (apolloData?.person?.email) {
          const result = {
            email: apolloData.person.email,
            enriched: true,
            source: 'apollo',
            phone: apolloData.person.phone_numbers?.[0]?.sanitized_number || null,
            linkedinUrl: apolloData.person.linkedin_url || null,
            title: apolloData.person.title || null,
            resolvedCompany: apolloData.person.organization?.name || null,
          }
          // Only deduct credit when email actually found
          const credit = await checkAndUseCredit(user.id)
          if (!credit.allowed) {
            return NextResponse.json({
              error: 'enrichment_limit_reached',
              message: `You've used all ${credit.limit} enrichments this month. Upgrade your plan for more.`,
              used: credit.used, limit: credit.limit,
            }, { status: 402 })
          }
          await setEmailCache(eKey, firstName, lastName, company, {
            email: result.email, source: 'apollo',
            extra_data: { phone: result.phone, linkedinUrl: result.linkedinUrl, title: result.title, resolvedCompany: result.resolvedCompany }
          })
          return NextResponse.json(result)
        }
      } catch (e) {
        console.error('Apollo error:', e)
      }
    }

    // ── Step 2: Hunter email finder ───────────────────────────────────────
    if (hunterKey) {
      try {
        const hunterQuery = resolvedDomain
          ? `domain=${encodeURIComponent(resolvedDomain)}`
          : `company=${encodeURIComponent(company)}`
        const hunterUrl = `https://api.hunter.io/v2/email-finder?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName || '')}&${hunterQuery}&api_key=${hunterKey}`
        const hunterData = await (await fetch(hunterUrl)).json()
        if (hunterData?.data?.email) {
          const credit = await checkAndUseCredit(user.id)
          if (!credit.allowed) {
            return NextResponse.json({
              error: 'enrichment_limit_reached',
              message: `You've used all ${credit.limit} enrichments this month. Upgrade your plan for more.`,
              used: credit.used, limit: credit.limit,
            }, { status: 402 })
          }
          await setEmailCache(eKey, firstName, lastName, company, { email: hunterData.data.email, source: 'hunter' })
          return NextResponse.json({ email: hunterData.data.email, enriched: true, source: 'hunter' })
        }
      } catch (e) {
        console.error('Hunter error:', e)
      }

      // ── Step 3: Hunter pattern guess ──────────────────────────────────
      try {
        const domainInfo = await hunterDomainSearch(hunterKey, resolvedDomain ? { domain: resolvedDomain } : { company })
        if (domainInfo?.pattern && domainInfo.domain) {
          // Cache domain pattern for this company
          if (!cachedCompany) {
            await setCompanyCache(cKey, company, { domain: domainInfo.domain, pattern: domainInfo.pattern })
          }
          const guessed = buildEmailFromPattern(domainInfo.pattern, firstName, lastName, domainInfo.domain)
          if (guessed) {
            const verification = await hunterVerifyEmail(hunterKey, guessed)
            if (verification.status && verification.status !== 'invalid' && verification.status !== 'disposable') {
              const credit = await checkAndUseCredit(user.id)
              if (!credit.allowed) {
                return NextResponse.json({
                  error: 'enrichment_limit_reached',
                  message: `You've used all ${credit.limit} enrichments this month. Upgrade your plan for more.`,
                  used: credit.used, limit: credit.limit,
                }, { status: 402 })
              }
              await setEmailCache(eKey, firstName, lastName, company, {
                email: guessed, source: 'hunter-pattern', guessed: true,
                extra_data: { confidence: verification.score }
              })
              return NextResponse.json({ email: guessed, enriched: true, guessed: true, confidence: verification.score, source: 'hunter-pattern' })
            }
          }
        }
      } catch (e) {
        console.error('Hunter pattern-guess error:', e)
      }
    }

    return NextResponse.json({
      enriched: false,
      source: null,
      message: 'No email found across all sources. Try editing the company name and searching again.',
    })

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
