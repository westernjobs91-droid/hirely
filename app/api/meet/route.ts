// app/api/meet/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

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

const prompts: Record<string, string> = {
  client_intake: `You are a recruiting CRM assistant. Generate a professional CLIENT INTAKE BRIEF from the meeting notes below. Use these bold section headers: **Role Details**, **Requirements**, **Compensation**, **Interview Process**, **Timeline**, **Next Steps**. Use bullet points under each. Write "Not discussed" if info is missing. No preamble.`,
  candidate_interview: `You are a recruiting CRM assistant. Generate a CANDIDATE ASSESSMENT from the interview notes below. Use these bold section headers: **Candidate Overview**, **Experience Highlights**, **Strengths**, **Concerns**, **Compensation**, **Availability**, **Hire Recommendation**. For Hire Recommendation write Strong yes, Yes, Maybe, or No then one sentence of reasoning. No preamble.`,
  internal_debrief: `You are a recruiting CRM assistant. Generate an INTERNAL DEBRIEF SUMMARY from the meeting notes below. Use these bold section headers: **Meeting Summary**, **Candidates Reviewed**, **Decisions Made**, **Action Items**, **Open Questions**. For Action Items format as: - [Task] Owner: [name] Due: [date or ASAP]. No preamble.`
}

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { notes, meeting_type } = body

  if (!notes || !meeting_type) {
    return NextResponse.json({ error: 'Notes and meeting type are required.' }, { status: 400 })
  }

  if (!prompts[meeting_type]) {
    return NextResponse.json({ error: 'Invalid meeting type.' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: prompts[meeting_type],
      messages: [{ role: 'user', content: `Meeting notes:\n\n${notes}` }]
    })

    const summary = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save to database
    await supabase
      .from('meeting_summaries')
      .insert({
        user_id: session.user.id,
        meeting_type,
        raw_notes: notes,
        summary
      })

    return NextResponse.json({ summary })

  } catch (err) {
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'Failed to generate summary. Please try again.' }, { status: 500 })
  }
}
