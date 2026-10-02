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

const iconPaths = {
  trash: 'M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6',
  refresh: 'M3 12a9 9 0 019-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9c-2.52 0-4.93-1-6.74-2.74L3 16M8 16H3v5',
  info: 'M12 11v6m0-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0',
  restore: 'M3 10h10a7 7 0 017 7M3 10l5-5m-5 5l5 5',
}

function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof iconPaths; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[name]} />
  </svg>
}

export default function TrashView({ userId, onRestored }: { userId: string; onRestored: () => void }) {
  const [rows, setRows] = useState<TrashedContact[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | number | null>(null)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [messageError, setMessageError] = useState(false)
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
      setMessageError(true)
      setMessage('Could not load Trash. Please retry or contact support.')
    } finally { setLoading(false) }
  }, [userId, page])
  useEffect(() => { load() }, [load])

  async function restore(contact: TrashedContact) {
    if (busy !== null) return
    setBusy(contact.id)
    setMessage('')
    setMessageError(false)
    try {
      await setContactTrashed(supabase, userId, contact.id, false)
      setMessage(`${contact.first_name} ${contact.last_name || ''} restored to Contacts.`)
      onRestored()
      await load()
    } catch (error) { setMessageError(true); setMessage((error as Error).message) }
    finally { setBusy(null) }
  }

  return <section className="w-full max-w-6xl p-4 sm:p-6" aria-label="Trashed contacts" aria-busy={loading}>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 sm:flex">
            <Icon name="trash" className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Deleted contacts</h2>
              {!loading && !failed && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600" aria-label={`${total} ${total === 1 ? 'contact' : 'contacts'}`}>{total}</span>}
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-500">Review and restore contacts you’ve removed.</p>
          </div>
        </div>
        <button type="button" onClick={() => { setMessage(''); load() }} disabled={loading || busy !== null}
          aria-label="Refresh Trash"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <Icon name="refresh" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div role="status" aria-atomic="true" className={message ? `border-b px-4 py-3 text-sm sm:px-6 ${messageError ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}` : 'sr-only'}>{message}</div>

      {loading ? <div className="px-6 py-16 text-center">
        <Icon name="refresh" className="mx-auto h-6 w-6 text-blue-500 motion-safe:animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Loading Trash…</p>
      </div> : failed ? <div className="px-6 py-16 text-center">
        <h3 className="font-semibold text-slate-900">Trash couldn’t load</h3>
        <p className="mt-2 text-sm text-slate-500">Use the refresh button above to try again.</p>
      </div> : !rows.length ? <div className="px-6 py-16 text-center sm:py-20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <Icon name="trash" className="h-6 w-6" />
        </div>
        <h3 className="mt-5 font-semibold text-slate-900">No contacts in Trash</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Contacts you remove will appear here, ready to restore if you change your mind.</p>
      </div> : <>
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_11rem_9rem] gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-medium text-slate-500 sm:grid">
          <span>Contact</span><span>Moved to Trash</span><span className="sr-only">Actions</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.map(contact => {
            const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed contact'
            const initials = [contact.first_name, contact.last_name].filter(Boolean).map(part => part[0]).join('').toUpperCase() || '?'
            const date = new Date(contact.deleted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            return <li key={contact.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-5 transition-colors hover:bg-slate-50/60 sm:grid-cols-[minmax(0,1fr)_11rem_9rem] sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div aria-hidden="true" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 sm:flex">{initials}</div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-900">{name}</p>
                  <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">{contact.company || 'No company'}</p>
                </div>
              </div>
              <time dateTime={contact.deleted_at} className="col-start-1 row-start-2 text-xs text-slate-500 sm:col-start-auto sm:row-start-auto sm:text-sm">
                <span className="sm:hidden">Deleted </span>{date}
              </time>
              <button type="button" disabled={busy !== null} onClick={() => restore(contact)} aria-label={`Restore ${name}`}
                className="col-start-2 row-span-2 row-start-1 inline-flex items-center justify-center gap-2 justify-self-end rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:text-sm">
                <Icon name="restore" />{busy === contact.id ? 'Restoring…' : 'Restore'}
              </button>
            </li>
          })}
        </ul>
      </>}
      {!failed && !loading && total > PAGE_SIZE && <nav aria-label="Trash pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} contacts</span>
        <div className="flex items-center gap-2">
          <button disabled={busy !== null || page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Previous</button>
          <span className="sr-only">Page {page + 1}</span>
          <button disabled={busy !== null || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500">Next</button>
        </div>
      </nav>}
      <footer className="flex items-start gap-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-4 text-xs leading-5 text-slate-500 sm:px-6">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p><span className="font-medium text-slate-600">Your contacts are safe here.</span> Nothing is automatically deleted. Restoring brings back notes, follow-ups and meeting links.</p>
      </footer>
    </div>
  </section>
}
