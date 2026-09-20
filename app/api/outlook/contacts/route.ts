import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/server-auth'
import { getEntitlements } from '@/lib/plans'
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({error:'Unauthorized'},{status:401})
  let access
  try { access = await getEntitlements(auth.db) }
  catch { return NextResponse.json({error:'Plan details unavailable.'},{status:503}) }
  if (!access.outlook) return NextResponse.json({error:'Outlook capture is included with Solo and Pro. Upgrade in Hirely.'},{status:403})
  let body
  try { body = await request.json() } catch { return NextResponse.json({error:'Invalid request'},{status:400}) }
  if (!body || typeof body.first_name !== 'string' || !body.first_name.trim()) return NextResponse.json({error:'A first name is required.'},{status:400})
  const fields=['first_name','last_name','email','company','job_title','original_email']
  if (fields.some(k=>body[k]!=null && (typeof body[k]!=='string' || body[k].length>(k==='original_email'?20000:2000)))) return NextResponse.json({error:'Invalid contact fields.'},{status:400})
  if (body.email) {
    const found=await auth.db.from('contacts').select('id,deleted_at').eq('user_id',auth.user.id).ilike('email',body.email.replace(/[\\%_]/g,'\\$&')).limit(1).maybeSingle()
    if(found.error)return NextResponse.json({error:'Could not check saved contacts.'},{status:503})
    if(found.data)return NextResponse.json({error:found.data.deleted_at?'This contact is in Trash. Restore it in Hirely before saving again.':'ALREADY_EXISTS'},{status:409})
  }
  const payload=Object.fromEntries(fields.map(k=>[k,body[k]||null]))
  const result=await auth.db.from('contacts').insert({...payload,user_id:auth.user.id,status:'active',column_name:'upcoming',status_label:'New',enriched:false,avatar_color:'#2563EB',activity:[]}).select('*').single()
  if(result.error)return NextResponse.json({error:result.error.code==='P0001'?result.error.message:'Could not save contact.'},{status:409})
  return NextResponse.json(result.data,{status:201})
}
