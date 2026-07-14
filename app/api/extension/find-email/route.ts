import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Auth check
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
    // Check email_cache first (free)
    if (contactId) {
      const { data: cached } = await supabase
        .from('email_cache')
        .select('email, confidence, email_type')
        .eq('contact_id', contactId)
        .single()

      if (cached?.email) {
        return NextResponse.json({
          ok: true,
          email: cached.email,
          confidence: cached.confidence,
          type: cached.email_type,
          source: 'cache'
        })
      }
    }

    // Hunter Email Finder — searches by name + company/domain
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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('[find-email] Hunter error', res.status, errData)
      return NextResponse.json({ ok: false, message: 'No email found for this contact.' })
    }

    const data = await res.json()
    const email = data.data?.email
    const confidence = data.data?.score ?? null
    const emailType = data.data?.type ?? null
    const emailDomain = data.data?.domain ?? domain ?? null

    if (!email) {
      return NextResponse.json({ ok: false, message: 'No email found for this contact.' })
    }

    // Save to email_cache
    if (contactId) {
      await supabase.from('email_cache').upsert({
        contact_id: contactId,
        email,
        confidence,
        email_type: emailType,
        domain: emailDomain,
        expires_at: '2099-01-01',
        created_at: new Date().toISOString()
      }, { onConflict: 'contact_id' })
    }

    // Update the contact record with found email + confidence score
    if (contactId) {
      // Fetch current activity array so we can append to it
      const { data: existing } = await supabase
        .from('contacts')
        .select('activity')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .single()

      const currentActivity = existing?.activity || []
      const newActivity = [
        ...currentActivity,
        { type: 'email_found', source: 'Hunter (extension)', date: new Date().toISOString() }
      ]

      await supabase
        .from('contacts')
        .update({
          email,
          email_confidence: confidence,
          enriched: true,
          activity: newActivity
        })
        .eq('id', contactId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      ok: true,
      email,
      confidence,
      type: emailType,
      source: 'hunter'
    })

  } catch (e) {
    console.error('[find-email]', e)
    return NextResponse.json({ ok: false, message: 'Email lookup failed.' }, { status: 500 })
  }
}
