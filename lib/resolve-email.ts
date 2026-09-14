import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticate } from './server-auth'
import { isFresh, normalizeDomain, normalizeName, predictEmail, providerStatus, EmailStatus } from './email-patterns'

export async function resolveEmail(request: Request) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { db, user } = auth
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const action = !body.action || body.action === 'predict' ? 'find' : body.action
  if (!['predict', 'find', 'verify'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  let contact: any = null
  if (body.contactId != null) {
    const { data, error } = await db.from('contacts').select('*').eq('id', body.contactId).eq('user_id', user.id).maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    contact = data
  }
  const text = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 250) : ''
  const first = text(contact?.first_name ?? body.firstName), last = text(contact?.last_name ?? body.lastName)
  const company = text(contact?.company ?? body.company), domain = normalizeDomain(text(body.domain))
  const identity = JSON.stringify([normalizeName(first), normalizeName(last), company.toLowerCase(), domain])
  if (!first || (!company && !domain)) return NextResponse.json({ error: 'A name and company or domain are required' }, { status: 400 })
  if (body.allowPaid !== true) return NextResponse.json({ error: 'Confirm a 1-credit email request. Update Hirely if you still see a free lookup button.' }, { status: 400 })
  let charged = false
  async function charge() {
    if (charged) return null
    const { data: reserved, error } = await db.rpc('reserve_hirely_credit', { feature: 'email' })
    if (error) return NextResponse.json({ error: 'Credit controls unavailable. Please try again.' }, { status: 503 })
    if (!reserved) return NextResponse.json({ error: 'Monthly email credit limit reached.' }, { status: 402 })
    charged = true
    return null
  }
  let cacheSaved = true
  async function finish(email: string, status: EmailStatus, source: string, checkedAt: string | null = null, evidence = '', score: number | null = null) {
    const creditError = await charge()
    if (creditError) return creditError
    const result = { creditsUsed: 1, cacheSaved, email, emailStatus: status, emailSource: source, emailCheckedAt: checkedAt, emailEvidence: evidence,
      confidence: score, guessed: status === 'predicted', enriched: true, ok: true, source }
    if (contact) {
      const { data, error } = await db.from('contacts').update({ email, enriched: true, email_status: status,
        email_source: source, email_checked_at: checkedAt, email_evidence: evidence, email_confidence: score,
      }).eq('id', contact.id).eq('user_id', user.id).select('id').single()
      if (error || !data) return NextResponse.json({ error: 'Email found but could not be saved. Check the database migration.', candidate: result }, { status: 503 })
    }
    return NextResponse.json(result)
  }
  const stored = contact?.email
  if (action === 'find' && stored && contact.email_status !== 'invalid') return finish(stored, contact.email_status || 'unverified', contact.email_source || 'saved', contact.email_checked_at, contact.email_evidence || '')
  if (stored && contact.email_status === 'valid' && isFresh(contact.email_checked_at)) return finish(stored, 'valid', contact.email_source || 'saved', contact.email_checked_at, contact.email_evidence || '')
  if (contact && action === 'find') {
    const { data: legacy } = await db.from('email_cache').select('email,created_at').eq('contact_id',contact.id).maybeSingle()
    if (legacy?.email && isFresh(legacy.created_at)) return finish(legacy.email,'unverified','legacy_cache',null,'Previously found address; verification status unavailable.')
  }
  const { data: cached } = await db.from('email_resolutions').select('*').eq('user_id', user.id).eq('identity_key', identity).maybeSingle()
  if (cached && isFresh(cached.created_at, 30) && ((action === 'find' && cached.status !== 'invalid') || (cached.status === 'valid' && isFresh(cached.checked_at) && (action !== 'verify' || !stored || cached.email === stored))))
    return finish(cached.email, cached.status, cached.source, cached.checked_at, cached.evidence, cached.provider_score)

  let candidate = stored || '', evidence = ''
  // Read curated company metadata only; never reuse another customer's contacts.
  if (!candidate && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const keys = [company.toLowerCase()], slug = text(body.linkedinSlug).toLowerCase()
    if (/^[a-z0-9-]+$/.test(slug)) keys.unshift('slug:' + slug)
    const { data: companies } = await service.from('company_cache').select('data,cache_key').in('cache_key', keys).gt('expires_at', new Date().toISOString())
    const match = companies?.find(c => c.data?.pattern && (!domain || normalizeDomain(c.data.domain || '') === domain))
    if (match) {
      candidate = predictEmail(first, last, match.data.domain, match.data.pattern) || ''
      evidence = 'Company pattern ' + match.data.pattern + '. Inbox not checked.'
      if (match.data.source_url) evidence += ' Source: ' + match.data.source_url
    }
  }
  if (action === 'find' && candidate && !stored) return finish(candidate, 'predicted', 'company_pattern', null, evidence)
  if (action === 'verify' && !candidate) return NextResponse.json({ error: 'Find or enter an email first.' }, { status: 400 })
  const key = process.env.HUNTER_API_KEY
  if (!key) return NextResponse.json({ error: 'Email search is temporarily unavailable. No credit used.' }, { status: 503 })
  const creditError = await charge()
  if (creditError) return creditError
  try {
    const params = new URLSearchParams({ api_key: key })
    if (action === 'verify') params.set('email', candidate)
    else {
      params.set('first_name', first); params.set('last_name', last)
      if (domain) params.set('domain', domain); else params.set('company', company)
    }
    const response = await fetch('https://api.hunter.io/v2/' + (action === 'verify' ? 'email-verifier' : 'email-finder') + '?' + params,
      { cache: 'no-store', signal: AbortSignal.timeout(20000) })
    if (!response.ok) return NextResponse.json({ error: 'Email search could not complete. This attempt used 1 email credit.' }, { status: 502 })
    const { data } = await response.json()
    const email = action === 'verify' ? candidate : data?.email
    if (!email) return NextResponse.json({ ok: false, enriched: false, creditsUsed: 1, message: 'No email found. 1 email credit used.' })
    const status = providerStatus(action === 'verify' ? data?.status : data?.verification?.status)
    const checkedAt = action === 'verify' ? new Date().toISOString() : data?.verification?.date || null
    const source = action === 'verify' ? 'hunter_verifier' : 'hunter_finder'
    const score = typeof data?.score === 'number' ? data.score : null
    const details = status === 'valid' ? 'Provider reports mailbox valid; person ownership is not independently confirmed.' : 'Provider result; inbox is not confirmed valid.'
    const { error: cacheError } = await db.from('email_resolutions').upsert({ user_id: user.id, identity_key: identity, email, status, source,
      checked_at: checkedAt, evidence: details, provider_score: score, created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,identity_key' })
    cacheSaved = !cacheError
    return finish(email, status, source, checkedAt, details, score)
  } catch { return NextResponse.json({ error: 'Email search timed out or failed. This attempt used 1 email credit; no automatic retry was made.' }, { status: 502 }) }
}
