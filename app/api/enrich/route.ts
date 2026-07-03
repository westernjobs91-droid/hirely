import { NextRequest, NextResponse } from 'next/server'

// LinkedIn often shows a brand/product name ("Kruger Products") rather than
// the actual registered entity Apollo/Hunter have on file ("Kruger Inc.").
// Rather than trying to guess the "real" name from LinkedIn's page (there's
// nothing more correct sitting in their DOM for us to find), we resolve it
// against Apollo's own company database — the same correction a recruiter
// would do by hand, just automatic.
async function resolveOrganizationDomain(apolloKey: string, company: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        api_key: apolloKey,
        q_organization_name: company,
        page: 1,
        per_page: 1,
      })
    })
    const data = await res.json()
    const org = data?.organizations?.[0] || data?.accounts?.[0]
    return org?.primary_domain || org?.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || null
  } catch (e) {
    console.error('Apollo organization search error:', e)
    return null
  }
}

async function apolloPeopleMatch(
  apolloKey: string,
  firstName: string,
  lastName: string,
  params: { organization_name?: string; domain?: string }
) {
  const res = await fetch('https://api.apollo.io/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({
      api_key: apolloKey,
      first_name: firstName,
      last_name: lastName || '',
      reveal_personal_emails: false,
      ...params,
    })
  })
  return res.json()
}

// Hunter's Domain Search returns the company's standard email pattern (e.g.
// "{first}.{last}") even when they don't have this specific person indexed —
// most companies use one consistent format across everyone on the team.
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
  } catch (e) {
    console.error('Hunter domain search error:', e)
    return null
  }
}

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
  if (!local || local.includes('{')) return null // pattern needed a piece we don't have (e.g. no last name)
  return `${local}@${domain}`
}

// Confirm the pattern-guessed address is actually deliverable before we
// hand it back — an unverified guess is worse than no email at all.
async function hunterVerifyEmail(hunterKey: string, email: string) {
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`
    )
    const data = await res.json()
    return { status: data?.data?.status || null, score: data?.data?.score ?? null }
  } catch (e) {
    console.error('Hunter verify error:', e)
    return { status: null, score: null }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company } = await req.json()

    if (!firstName || !company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hunterKey = process.env.HUNTER_API_KEY
    const apolloKey = process.env.APOLLO_API_KEY
    let resolvedDomain: string | null = null

    if (apolloKey) {
      try {
        // STEP 1 — Try the company name exactly as scraped.
        let apolloData = await apolloPeopleMatch(apolloKey, firstName, lastName, { organization_name: company })

        // STEP 1.5 — Didn't match. Look up the real organization in Apollo's
        // own database (handles "Kruger Products" -> "Kruger Inc." style
        // brand-name-vs-legal-entity mismatches) and retry using its domain,
        // which matches far more reliably than a free-text company name.
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
            source: 'apollo'
          })
        }
      } catch (e) {
        console.error('Apollo error:', e)
      }
    }

    if (hunterKey) {
      try {
        // Prefer the resolved domain over the raw company name here too, if
        // Apollo's organization search found one — Hunter's domain search is
        // more reliable than its free-text company search for the same reason.
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
            source: 'hunter'
          })
        }
      } catch (e) {
        console.error('Hunter error:', e)
      }

      // STEP 3 — Neither service has this specific person indexed. Most
      // companies use one consistent email format across everyone on the
      // team (first.last@, flast@, etc.) — look up that pattern and build +
      // verify a likely address rather than giving up entirely.
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
                source: 'hunter-pattern'
              })
            }
          }
        }
      } catch (e) {
        console.error('Hunter pattern-guess error:', e)
      }
    }

    return NextResponse.json({ enriched: false, source: null })

  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 })
  }
}
