import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    apollo: !!process.env.APOLLO_API_KEY,
    hunter: !!process.env.HUNTER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  })
}
