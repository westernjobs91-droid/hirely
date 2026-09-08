import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ---- TYPES MATCHING YOUR REAL SUPABASE TABLES ----

export type Contact = {
  id: number                    // bigint
  created_at: string
  user_id: string               // uuid
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  linkedin_url?: string
  avatar_color?: string
  status?: string
  column_name?: string
  status_label?: string
  sent_date?: string
  original_email?: string
  enriched?: boolean
  notes?: string
  activity?: string[]
  ai_drafts?: Record<string, unknown>
  email_confidence?: number
}

export type Profile = {
  id: string                    // uuid
  full_name?: string
  email?: string
  company?: string
  plan?: 'free' | 'solo' | 'pro' | 'agency'
  meet_credits?: number
  created_at?: string
}

export type MeetingSummary = {
  id: string                    // uuid
  user_id: string
  meeting_type: 'client_intake' | 'candidate_interview' | 'internal_debrief'
  raw_notes?: string
  summary?: string
  created_at: string
}

export type Followup = {
  id: string                    // uuid
  user_id: string
  contact_id: number            // bigint — matches contacts.id
  draft?: string
  sent?: boolean
  created_at: string
}
