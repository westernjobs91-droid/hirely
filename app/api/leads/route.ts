// app/api/leads/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

// GET /api/leads — fetch all contacts for logged in user
export async function GET() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/leads — add a new contact manually
export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { first_name, last_name, email, phone, company, job_title, linkedin_url, notes, original_email } = body

  if (!first_name || !last_name) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 })
  }

  const colors = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2']
  const avatar_color = colors[Math.floor(Math.random() * colors.length)]

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: session.user.id,
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

// PATCH /api/leads — update contact
export async function PATCH(request: Request) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/leads — delete a contact
export async function DELETE(request: Request) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
