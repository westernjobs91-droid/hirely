export type ContactStatus = 'overdue' | 'due-today' | 'upcoming' | 'replied' | 'meeting-set' | 'no-response'
export type PipelineColumn = 'today' | 'upcoming' | 'done'

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  jobTitle: string
  linkedinUrl: string
  photoUrl?: string | null
  avatarColor: string
  status: ContactStatus
  column: PipelineColumn
  statusLabel: string
  sentDate: string
  originalEmail: string
  enriched: boolean
  emailStatus?: 'unverified' | 'predicted' | 'valid' | 'invalid' | 'accept_all' | 'unknown'
  emailSource?: string
  emailCheckedAt?: string | null
  emailEvidence?: string
  activity: string[]
  notes: string
  aiDrafts?: AIDraft[]
  createdAt?: string
}

export interface AIDraft {
  id: string
  label: string
  timing: string
  body: string
}

export type NavItem = 'dashboard' | 'contacts' | 'followups' | 'ai-drafts' | 'analytics' | 'enrichment' | 'meet' | 'settings' | 'trash'
