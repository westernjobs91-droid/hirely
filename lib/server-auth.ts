import { createClient } from '@supabase/supabase-js'
export async function authenticate(request: Request) {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7)
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error } = await db.auth.getUser(token)
  return error || !user ? null : { db, user }
}
