import type { Contact } from '@/types'
export function localDay(now=new Date()):string {
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}
export function validDay(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
 const d=new Date(value+'T12:00:00')
 return !Number.isNaN(d.getTime())&&localDay(d)===value
}
export function addDays(day:string,days:number):string {
 const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+days);return localDay(d)
}
export function followUpDay(c:Contact):string {
 if(validDay(c.sentDate))return c.sentDate
 // Recover the old Add Contact default, which stored a label but no date.
 if(c.statusLabel==='Due in 2 weeks'&&c.createdAt){const d=new Date(c.createdAt);if(!Number.isNaN(d.getTime()))return addDays(localDay(d),14)}
 return ''
}
export function normalizeFollowUp(c:Contact,today=localDay()):Contact {
 if(c.column==='done')return {...c,statusLabel:'Done',status:['replied','meeting-set'].includes(c.status)?c.status:'no-response'}
 const due=followUpDay(c)
 if(due){
  const future=due>today,overdue=due<today
  return {...c,sentDate:due,column:future?'upcoming':'today',status:future?'upcoming':overdue?'overdue':'due-today',statusLabel:future?'Due '+new Date(due+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):overdue?'Overdue':'Due today'}
 }
 return {...c,status:c.column==='today'?'due-today':['replied','meeting-set'].includes(c.status)?c.status:'upcoming',statusLabel:c.column==='today'?'Follow up today':['replied','meeting-set'].includes(c.status)?c.statusLabel:'No follow-up scheduled'}
}
export function matchesPipelineFilter(c:Contact,filter:string,today=localDay()):boolean {
 if(filter==='Overdue')return c.column!=='done'&&c.status==='overdue'
 if(filter==='Replied')return c.status==='replied'||c.status==='meeting-set'
 if(filter==='This week'){
  const date=new Date(today+'T12:00:00'),start=addDays(today,-((date.getDay()+6)%7)),end=addDays(start,6),due=followUpDay(c)
  return c.column!=='done'&&!!due&&due>=start&&due<=end
 }
 return true
}

export function schedulingPatch(current:Contact,updates:Partial<Contact>):Partial<Contact> {
 if(updates.sentDate===undefined&&updates.column===undefined)return {...updates}
 if(updates.sentDate!==undefined&&updates.sentDate!==''&&!validDay(updates.sentDate))throw new Error('Choose a valid follow-up date.')
 const next=normalizeFollowUp({...current,...updates,...(updates.sentDate!==undefined?{column:updates.column||'upcoming'}:{})})
 return {...updates,column:next.column,status:next.status,statusLabel:next.statusLabel,sentDate:next.sentDate}
}
