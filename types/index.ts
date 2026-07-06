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
  avatarColor: string
  status: ContactStatus
  column: PipelineColumn
  statusLabel: string
  sentDate: string
  originalEmail: string
  enriched: boolean
  activity: string[]
  notes: string
  aiDrafts?: AIDraft[]
}

export interface AIDraft {
  id: string
  label: string
  timing: string
  body: string
}

export type NavItem = 'dashboard' | 'contacts' | 'followups' | 'ai-drafts' | 'analytics' | 'enrichment' | 'settings'
