import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { authenticate } from '@/lib/server-auth'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
const bucket = 'hirely-meet-audio'
const extensions = ['mp3','m4a','wav','webm','ogg','flac','mp4']
const maxBytes = 24 * 1024 * 1024
export async function POST(request: Request) {
 const auth = await authenticate(request)
 if (!auth) return NextResponse.json({error:'Unauthorized'},{status:401})
 let body: any
 try { body = await request.json() } catch { return NextResponse.json({error:'Invalid request'},{status:400}) }
 if (!body || !['upload','transcribe'].includes(body.action)) return NextResponse.json({error:'Invalid action'},{status:400})
 const {db,user} = auth
 const key = process.env.OPENAI_API_KEY
 if (!key) return NextResponse.json({error:'Audio transcription is not configured yet. You can still paste notes or a transcript.'},{status:503})
 const storage = db.storage.from(bucket)
 if (body.action === 'upload') {
  const ext = typeof body.name === 'string' ? body.name.split('.').pop()?.toLowerCase() : ''
  if (!ext || !extensions.includes(ext) || !Number.isInteger(body.size) || body.size <= 0 || body.size > maxBytes)
   return NextResponse.json({error:'Choose an MP3, M4A, WAV, WebM, OGG, FLAC or MP4 file up to 24 MB.'},{status:400})
  const path = user.id + '/' + randomUUID() + '.' + ext
  const {data,error} = await storage.createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({error:'Private audio storage is unavailable. Apply the Meet audio migration.'},{status:503})
  return NextResponse.json({path,token:data.token,bucket})
 }
 // Never accept a caller-provided URL. Read only this user's private upload.
 const path = body.path
 if (typeof path !== 'string' || !path.startsWith(user.id + '/') || !/^[0-9a-f-]{36}\.(mp3|m4a|wav|webm|ogg|flac|mp4)$/.test(path.slice(user.id.length+1)))
  return NextResponse.json({error:'Audio file not found'},{status:404})
 if (body.allowPaid !== true) return NextResponse.json({error:'Choose Transcribe audio to use 1 Meet credit.'},{status:400})
 let audio: Blob
 try {
  const {data,error} = await storage.download(path)
  if (error || !data) return NextResponse.json({error:'Audio upload was not found. Choose the file again.'},{status:404})
  audio = data
 } catch { return NextResponse.json({error:'Could not read the audio upload.'},{status:503}) }
 if (!audio.size || audio.size > maxBytes) return NextResponse.json({error:'Choose a recording up to 24 MB.'},{status:400})
 const {data:credit,error:creditError} = await db.rpc('reserve_hirely_credit',{feature:'meet'})
 if (creditError || !credit) return NextResponse.json({error:'Meet credit limit reached or credit controls unavailable.'},{status:creditError?503:402})
 try {
  const form = new FormData()
  form.set('model','whisper-1')
  form.set('response_format','json')
  form.set('file',audio,path.split('/').pop()!)
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
   method:'POST',headers:{Authorization:'Bearer '+key},body:form,
   signal:AbortSignal.timeout(90000),cache:'no-store',
  })
  if (!response.ok) throw new Error('Transcription failed')
  const result = await response.json()
  const transcript = result.text
  if (typeof transcript !== 'string' || !transcript.trim()) return NextResponse.json({error:'No speech was detected. Try a clearer recording. This transcription used 1 Meet credit.'},{status:422})
  return NextResponse.json({transcript:transcript.trim(),creditsUsed:1})
 } catch {
  return NextResponse.json({error:'Transcription could not finish. Try a shorter recording. This attempt used 1 Meet credit; it was not retried automatically.'},{status:502})
 }
}
