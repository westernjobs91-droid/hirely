import { NextResponse } from 'next/server'
export { resolveEmail as POST } from '@/lib/resolve-email'
// Compatibility for older extensions: opening a profile never spends credits.
export async function GET() { return NextResponse.json({ found: false }) }
