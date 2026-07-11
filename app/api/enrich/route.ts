import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Credit check via Supabase RPC ─────────────────────────────────────────
async function checkAndUseCredit(userId: string): Promise<{
  allowed: boolean
  used?: number
  limit?: number
  remaining?: number
  reason?: string
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase.rpc('check_and_use_enrichment_credit', {
    user_id: userId
  })
  if (error) {
    console.error('Credit check error:', error)
    return { allowed: false, reason: 'credit_check_failed' }
  }
  return data as { allowed: boolean; used: number; limit: number; remaining: number; reason?: string }
}

// ── Apollo org resolution ─────────────────────────────────────────────────
async function resolveOrganizationDomain(apolloKey: string, company: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.apollo.io/api/v1/mixed_companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${apolloKey}`,
      },
      body: JSON.stringify({ q_organization_name: company, page: 1, per_page: 1 })
    })
    const text = await res.text()
    if (!res.ok) return null
    const data = JSON.parse(text)
    const org = data?.organizations?.[0] || data?.accounts?.[0]
    return org?.primary_domain || org?.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || null
  } catch (e) {
    return null
  }
}

// ── Apollo people match ───────────────────────────────────────────────────
async function apolloPeopleMatch(
  apolloKey: string,
  firstName: string,
  lastName: string,
  params: { organization_name?: string; domain?: string }
) {
  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${apolloKey}`,
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName || '',
      reveal_personal_emails: false,
      ...params,
    })
  })
  const text = await res.text()
  if (!res.ok) return {}
  try { return JSON.parse(text) } catch { return {} }
}

// ── Hunter domain search ──────────────────────────────────────────────────
async function hunterDomainSearch(hunterKey: string, domainOrCompany: { domain?: string; company?: string }) {
  try {
    const params = new URLSearchParams({ api_key: hunterKey, limit: '1' })
    if (domainOrCompany.domain) params.set('domain', domainOrCompany.domain)
    else if (domainOrCompany.company) params.set('company', domainOrCompany.company)
    else return null
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params.toString()}`)
    const data = await res.json()
    return {
      pattern: data?.data?.pattern || null,
      domain: data?.data?.domain || domainOrCompany.domain || null,
    }
  } catch { return null }
}

// ── Email pattern builder ─────────────────────────────────────────────────
function buildEmailFromPattern(pattern: string, firstName: string, lastName: string, domain: string): string | null {
  if (!pattern || !domain) return null
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const last = (lastName || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!first) return null
  const local = pattern
    .replace(/\{first\}/g, first)
    .replace(/\{last\}/g, last)
    .replace(/\{f\}/g, first[0] || '')
    .replace(/\{l\}/g, last[0] || '')
  if (!local || local.includes('{')) return null
  return `${local}@${domain}`
}

// ── Hunter email verifier ─────────────────────────────────────────────────
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
    const { firstName, lastName, company, userId } = await req.json()

    if (!firstName || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Credit check ──────────────────────────────────────────────────────
    if (userId) {
      const credit = await checkAndUseCredit(userId)
      if (!credit.allowed) {
        if (credit.reason === 'limit_reached') {
          return NextResponse.json({
            error: 'enrichment_limit_reached',
            message: `You've used all ${credit.limit} enrichments this month. Upgrade your plan for more.`,
            used: credit.used,
            limit: credit.limit,
          }, { status: 402 })
        }
        return NextResponse.json({ error: 'Credit check failed' }, { status: 500 })
      }
    }

    const hunterKey = process.env.HUNTER_API_KEY
    const apolloKey = process.env.APOLLO_API_KEY
    let resolvedDomain: string | null = null

    // ── Step 1: Apollo people match ───────────────────────────────────────
    if (apolloKey) {
      try {
        let apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { organization_name: company })

        if (!apolloData?.person?.email) {
          resolvedDomain = await resolveOrganizationDomain(apolloKey, company)
          if (resolvedDomain) {
            apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { domain: resolvedDomain })
          }
        }

        if (apolloData?.person?.email) {
          return NextResponse.json({
            email: apolloData.person.email,
            phone: apolloData.person.phone_numbers?.[0]?.sanitized_number || null,
            linkedinUrl: apolloData.person.linkedin_url || null,
            title: apolloData.person.title || null,
            resolvedCompany: apolloData.person.organization?.name || null,
            enriched: true,
            source: 'apollo',
          })
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
        const hunterRes = await fetch(hunterUrl)
        const hunterData = await hunterRes.json()
        if (hunterData?.data?.email) {
          return NextResponse.json({
            email: hunterData.data.email,
            enriched: true,
            source: 'hunter',
          })
        }
      } catch (e) {
        console.error('Hunter error:', e)
      }

      // ── Step 3: Hunter pattern guess ──────────────────────────────────
      try {
        const domainInfo = await hunterDomainSearch(
          hunterKey,
          resolvedDomain ? { domain: resolvedDomain } : { company }
        )
        if (domainInfo?.pattern && domainInfo.domain) {
          const guessed = buildEmailFromPattern(domainInfo.pattern, firstName, lastName, domainInfo.domain)
          if (guessed) {
            const verification = await hunterVerifyEmail(hunterKey, guessed)
            if (verification.status && verification.status !== 'invalid' && verification.status !== 'disposable') {
              return NextResponse.json({
                email: guessed,
                enriched: true,
                guessed: true,
                confidence: verification.score,
                source: 'hunter-pattern',
              })
            }
          }
        }
      } catch (e) {
        console.error('Hunter pattern-guess error:', e)
      }
    }

    // ── All sources exhausted ─────────────────────────────────────────────
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
