import { Contact } from '@/types'
export default function EmailStatusBadge({ contact }: { contact: Contact }) {
 if (!contact.email) return null
 const status = contact.emailStatus || 'unverified'
 const current = status === 'valid' && contact.emailCheckedAt && Date.now() - Date.parse(contact.emailCheckedAt) < 90*86400000
 const label = current ? 'Mailbox verified' : status === 'valid' ? 'Recheck email' : status === 'predicted' ? 'Predicted' : status === 'accept_all' ? 'Catch-all' : status === 'invalid' ? 'Invalid' : 'Not verified'
 return <span title={contact.emailEvidence || label} className={'inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ' + (current ? 'bg-emerald-50 text-emerald-700' : status === 'invalid' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>{label}</span>
}
