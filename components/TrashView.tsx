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
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0111.55-2.6L20 7M4 17l2.35 2.6A7 7 0 0017.9 17',
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

  return <section className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8" aria-label="Trashed contacts" aria-busy={loading}>
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Trash</h2>
          {!loading && !failed && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {total} {total === 1 ? 'contact' : 'contacts'}
          </span>}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">A place for contacts you’ve removed. Restore them whenever you need them.</p>
      </div>
      <button type="button" onClick={() => { setMessage(''); load() }} disabled={loading || busy !== null}
        aria-label="Refresh Trash" title="Refresh Trash"
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        <Icon name="refresh" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />
      </button>
    </header>

    <div role="status" aria-atomic="true" className={message ? `rounded-xl border px-4 py-3 text-sm ${messageError ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}` : 'sr-only'}>{message}</div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_10rem_8rem] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-medium text-slate-500 sm:grid">
          <span>Contact</span><span>Deleted on</span><span className="text-right">Action</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.map(contact => {
            const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed contact'
            const initials = [contact.first_name, contact.last_name].filter(Boolean).map(part => part[0]).join('').toUpperCase() || '?'
            const date = new Date(contact.deleted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            return <li key={contact.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-5 transition-colors hover:bg-slate-50/60 sm:grid-cols-[minmax(0,1fr)_10rem_8rem] sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div aria-hidden="true" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600 sm:flex">{initials}</div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-900">{name}</p>
                  <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">{contact.company || 'No company'}</p>
                </div>
              </div>
              <time dateTime={contact.deleted_at} className="col-start-1 row-start-2 text-xs text-slate-500 sm:col-start-auto sm:row-start-auto sm:text-sm">
                <span className="sm:hidden">Deleted </span>{date}
              </time>
              <button type="button" disabled={busy !== null} onClick={() => restore(contact)} aria-label={`Restore ${name}`}
                className="col-start-2 row-span-2 row-start-1 inline-flex items-center justify-center gap-2 justify-self-end rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:text-sm">
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
    </div>
    <div className="flex items-start gap-2.5 px-1 text-xs leading-5 text-slate-500">
      <Icon name="restore" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <p>Restoring a contact brings back their notes, follow-ups and meeting links.<br className="hidden sm:block" /> Nothing in Trash is automatically deleted.</p>
    </div>
  </section>
}
