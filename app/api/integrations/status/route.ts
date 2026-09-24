import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    apollo: !!process.env.APOLLO_API_KEY,
    anymail: !!process.env.ANYMAIL_FINDER_API_KEY && Number(process.env.ANYMAIL_FINDER_CREDIT_LIMIT || 0) > 0,
    exa: !!process.env.EXA_API_KEY && Number(process.env.EXA_MONTHLY_REQUEST_LIMIT || 0) > 0,
    hunter: !!process.env.HUNTER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  })
}
