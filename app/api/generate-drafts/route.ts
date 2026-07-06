import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company, jobTitle, originalEmail } = await req.json()

    if (!firstName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
        { status: 500 }
      )
    }

    const contextLines = [
      `Name: ${firstName} ${lastName || ''}`.trim(),
      company ? `Company: ${company}` : null,
      jobTitle ? `Title: ${jobTitle}` : null,
      originalEmail ? `Original email exchanged with them:\n${originalEmail.slice(0, 1500)}` : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are a staffing/recruiting assistant helping a recruiter at Western Jobs (a staffing agency in the GTA and Southwestern Ontario) write short, natural follow-up emails to a business contact.

Write exactly 3 follow-up email drafts for a sequence: a 2-week follow-up, a 1-month follow-up, and a final short attempt. Each should:
- Be brief (3-5 sentences), warm, and professional — not pushy or salesy
- Reference the contact's name and company naturally where it fits, without forcing it into every sentence
- Build on any prior email content given, rather than repeating it
- Get progressively shorter and lower-pressure across the 3 drafts, ending with an easy no-commitment close on the final one
- Avoid corporate buzzwords and generic filler

Respond with ONLY a JSON array of exactly 3 objects, no markdown fences, no preamble, in this exact shape:
[
  {"label": "2-week follow-up", "timing": "2 weeks", "body": "..."},
  {"label": "1-month follow-up", "timing": "1 month", "body": "..."},
  {"label": "Final attempt", "timing": "Final", "body": "..."}
]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Here's who I'm following up with:\n\n${contextLines}` }
        ]
      })
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('Anthropic API error:', res.status, text)
      return NextResponse.json({ error: 'Draft generation failed.' }, { status: 502 })
    }

    const data = JSON.parse(text)
    const rawText = data?.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
    const cleaned = rawText.replace(/```json|```/g, '').trim()

    let drafts
    try {
      drafts = JSON.parse(cleaned)
    } catch (e) {
      console.error('Failed to parse Claude drafts response:', rawText)
      return NextResponse.json({ error: 'Could not parse generated drafts.' }, { status: 502 })
    }

    if (!Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json({ error: 'No drafts generated.' }, { status: 502 })
    }

    const withIds = drafts.map((d, i) => ({ id: String(i + 1), ...d }))

    return NextResponse.json({ drafts: withIds })

  } catch (error) {
    console.error('Draft generation error:', error)
    return NextResponse.json({ error: 'Draft generation failed.' }, { status: 500 })
  }
}
