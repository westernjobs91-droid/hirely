import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'

export const runtime = 'nodejs'

const BUCKET = 'hirely-contact-photos'
const MAX_BYTES = 5 * 1024 * 1024
const LINKEDIN_IMAGE_HOST = /^media(?:-exp\d+)?\.licdn\.com$/i
const CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function isAllowedLinkedInPhoto(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && LINKEDIN_IMAGE_HOST.test(url.hostname)
  } catch {
    return false
  }
}

async function downloadPhoto(source: string) {
  let current = source
  for (let redirects = 0; redirects <= 2; redirects += 1) {
    if (!isAllowedLinkedInPhoto(current)) throw new Error('Unsupported profile photo host.')
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'Hirely contact photo importer' },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Profile photo redirect was invalid.')
      current = new URL(location, current).toString()
      continue
    }
    if (!response.ok) throw new Error('LinkedIn no longer provides this profile photo.')
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const extension = CONTENT_TYPES[contentType]
    if (!extension) throw new Error('LinkedIn returned an unsupported image format.')
    const declaredSize = Number(response.headers.get('content-length') || 0)
    if (declaredSize > MAX_BYTES) throw new Error('Profile photo is too large.')
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Profile photo is empty or too large.')
    return { bytes, contentType, extension }
  }
  throw new Error('Profile photo redirected too many times.')
}

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const contactId = String(body.contactId || '').trim()
  const photoUrl = String(body.photoUrl || '').trim()
  if (!contactId || !isAllowedLinkedInPhoto(photoUrl)) {
    return NextResponse.json({ error: 'A valid contact and LinkedIn profile photo are required.' }, { status: 400 })
  }

  const { data: contact, error: contactError } = await auth.db
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', auth.user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (contactError) return NextResponse.json({ error: 'Could not verify the contact.' }, { status: 500 })
  if (!contact) return NextResponse.json({ error: 'Contact not found in your account.' }, { status: 404 })

  try {
    const image = await downloadPhoto(photoUrl)
    const path = `${auth.user.id}/${contact.id}.${image.extension}`
    const { error: uploadError } = await auth.db.storage
      .from(BUCKET)
      .upload(path, image.bytes, { contentType: image.contentType, upsert: true, cacheControl: '3600' })
    if (uploadError) throw uploadError

    const { data: updated, error: updateError } = await auth.db
      .from('contacts')
      .update({ photo_path: path, photo_url: photoUrl })
      .eq('id', contact.id)
      .eq('user_id', auth.user.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (updateError || !updated) throw updateError || new Error('Contact could not be updated.')
    return NextResponse.json({ ok: true, photoPath: path })
  } catch (error) {
    console.error('[contact-photo]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profile photo could not be saved.' },
      { status: 502 },
    )
  }
}
