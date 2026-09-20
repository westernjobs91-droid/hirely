'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setContactTrashed } from '@/lib/contact-trash'

interface TrashedContact {
  id: string | number
  first_name: string
  last_name: string
  company: string | null
  deleted_at: string
}
const PAGE_SIZE = 50

export default function TrashView({ userId, onRestored }: { userId: string; onRestored: () => void }) {
  const [rows, setRows] = useState<TrashedContact[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | number | null>(null)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const { data, count, error } = await supabase.from('contacts')
        .select('id,first_name,last_name,company,deleted_at', { count: 'exact' })
        .eq('user_id', userId).not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }).order('id', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (error) throw error
      setRows(data || [])
      setTotal(count || 0)
      if (!data?.length && page > 0) setPage(page - 1)
    } catch {
      setRows([])
      setFailed(true)
      setMessage('Could not load Trash. Please retry or contact support.')
    } finally { setLoading(false) }
  }, [userId, page])
  useEffect(() => { load() }, [load])

  async function restore(contact: TrashedContact) {
    if (busy !== null) return
    setBusy(contact.id)
    setMessage('')
    try {
      await setContactTrashed(supabase, userId, contact.id, false)
      setMessage(`${contact.first_name} ${contact.last_name || ''} restored to Contacts.`)
      onRestored()
      await load()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(null) }
  }

  return <section className="p-6 space-y-4" aria-label="Trashed contacts">
    <p className="text-sm text-slate-600">Restore contacts with their notes, follow-ups and meeting links intact. Nothing in Trash is automatically deleted.</p>
    <div role="status" className="text-sm text-slate-700">{message}</div>
    <button onClick={() => { setMessage(''); load() }} disabled={loading || busy !== null} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500">Refresh Trash</button>
    {loading ? <p>Loading Trash…</p> : failed ? null : !rows.length ? <p className="text-slate-500">No contacts in Trash.</p> :
      <ul className="divide-y rounded-xl border bg-white">
        {rows.map(contact => <li key={contact.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{contact.first_name} {contact.last_name}</p>
            <p className="text-sm text-slate-600">{contact.company}</p>
            <p className="text-xs text-slate-500">Moved to Trash {new Date(contact.deleted_at).toLocaleDateString()}</p>
          </div>
          <button disabled={busy !== null} onClick={() => restore(contact)} aria-label={`Restore ${contact.first_name} ${contact.last_name || ''}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            {busy === contact.id ? 'Restoring…' : 'Restore'}
          </button>
        </li>)}
      </ul>}
    <div className="flex items-center gap-3 text-sm">
      <button disabled={loading || busy !== null || page === 0} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Previous</button>
      <span>Page {page + 1} · {total} contacts</span>
      <button disabled={loading || busy !== null || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Next</button>
    </div>
  </section>
}
