// app/api/leads/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { setContactTrashed } from '@/lib/contact-trash'

function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json()
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch { return null }
}
function validId(value: unknown) {
  return (typeof value === 'string' && !!value.trim()) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
}
// Ownership, enrichment evidence and system fields must never be client writable.
const contactTextFields = new Set(['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'linkedin_url', 'notes', 'original_email'])
function validateContactFields(fields: Record<string, unknown>): string | null {
  if (!Object.keys(fields).length) return 'Provide contact fields to update.'
  for (const [key, value] of Object.entries(fields)) {
    if (!contactTextFields.has(key)) return 'Unsupported contact field: ' + key
    if (value !== undefined && value !== null && typeof value !== 'string') return 'Contact fields must be text.'
    if (typeof value === 'string' && value.length > (key === 'notes' || key === 'original_email' ? 20000 : 2000)) return 'Contact field is too long.'
    if ((key === 'first_name' || key === 'last_name') && (typeof value !== 'string' || !value.trim())) return 'First and last name cannot be empty.'
  }
  return null
}

// GET /api/leads: fetch all contacts for logged in user
export async function GET(request: Request) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const trash = new URL(request.url).searchParams.get('view') === 'trash'
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
  query = trash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  const { data, error } = await query
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/leads: add a new contact manually
export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readBody(request)
  if (!body) return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 })
  const { first_name, last_name, email, phone, company, job_title, linkedin_url, notes, original_email } = body

  if (typeof first_name !== 'string' || !first_name.trim() || typeof last_name !== 'string' || !last_name.trim()) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 })
  }

  const invalid = validateContactFields({ first_name, last_name, email, phone, company, job_title, linkedin_url, notes, original_email })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const colors = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2']
  const avatar_color = colors[Math.floor(Math.random() * colors.length)]

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      job_title: job_title || null,
      linkedin_url: linkedin_url || null,
      notes: notes || null,
      original_email: original_email || null,
      avatar_color,
      status: 'new',
      enriched: false,
      activity: [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/leads: update contact
export async function PATCH(request: Request) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readBody(request)
  if (!body) return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 })
  const { id, ...updates } = body
  if (updates.action === 'restore' && Object.keys(updates).length === 1) {
    if (!validId(id)) return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
    try {
      await setContactTrashed(supabase, user.id, id as string | number, false)
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 409 })
    }
  }
  const invalid = validateContactFields(updates)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  if (!validId(id)) {
    return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contacts')
    .update({...updates, ...(Object.prototype.hasOwnProperty.call(updates, 'email') ? {email_status:'unverified', email_source:'manual', email_checked_at:null, email_evidence:''} : {})})
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/leads: move to Trash; preserve the row and related records.
export async function DELETE(request: Request) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readBody(request)
  if (!body || !validId(body.id)) return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
  const { id } = body

  try {
    await setContactTrashed(supabase, user.id, id as string | number, true)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 })
  }

  return NextResponse.json({ success: true })
}
