import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId, firstName, lastName, company, domain } = await req.json()
  if (!firstName || !lastName) {
    return NextResponse.json({ ok: false, error: 'First and last name required' }, { status: 400 })
  }

  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) return NextResponse.json({ ok: false, error: 'Hunter not configured' }, { status: 500 })

  try {
    // Check email_cache first (free — no Hunter credit burned)
    if (contactId) {
      const { data: cached } = await supabase
        .from('email_cache')
        .select('email, confidence, email_type')
        .eq('contact_id', contactId)
        .single()

      if (cached?.email) {
        // Also make sure the contact record has the email (in case it was missed before)
        await supabase
          .from('contacts')
          .update({ email: cached.email, enriched: true })
          .eq('id', contactId)
          .eq('user_id', user.id)

        return NextResponse.json({
          ok: true,
          email: cached.email,
          confidence: cached.confidence,
          type: cached.email_type,
          source: 'cache'
        })
      }
    }

    // Hunter Email Finder
    const params = new URLSearchParams({
      first_name: firstName,
      last_name: lastName,
      api_key: hunterKey,
    })
    if (domain) params.set('domain', domain)
    else if (company) params.set('company', company)

    const res = await fetch(
      `https://api.hunter.io/v2/email-finder?${params.toString()}`,
      { method: 'GET' }
    )

    const data = await res.json()
    const email = data.data?.email
    const confidence = data.data?.score ?? null
    const emailType = data.data?.type ?? null
    const emailDomain = data.data?.domain ?? domain ?? null

    if (!email) {
      return NextResponse.json({ ok: false, message: 'No email found for this contact.' })
    }

    // 1. Update contact email — this is the critical write, do it first and separately
    if (contactId) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ email, enriched: true })
        .eq('id', contactId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[find-email] contact update error:', updateError)
      }

      // 2. Try to append activity log (non-critical, ignore error)
      try {
        const { data: existing } = await supabase
          .from('contacts')
          .select('activity')
          .eq('id', contactId)
          .eq('user_id', user.id)
          .single()

        const newActivity = [
          ...(existing?.activity || []),
          { type: 'email_found', source: 'Hunter (extension)', date: new Date().toISOString() }
        ]
        await supabase
          .from('contacts')
          .update({ activity: newActivity })
          .eq('id', contactId)
          .eq('user_id', user.id)
      } catch (_) { /* non-critical */ }

      // 3. Save to email_cache (non-critical, ignore error)
      try {
        await supabase.from('email_cache').upsert({
          contact_id: contactId,
          email,
          confidence,
          email_type: emailType,
          domain: emailDomain,
          expires_at: '2099-01-01',
          created_at: new Date().toISOString()
        }, { onConflict: 'contact_id' })
      } catch (_) { /* non-critical */ }
    }

    return NextResponse.json({ ok: true, email, confidence, type: emailType, source: 'hunter' })

  } catch (e) {
    console.error('[find-email]', e)
    return NextResponse.json({ ok: false, message: 'Email lookup failed.' }, { status: 500 })
  }
}
