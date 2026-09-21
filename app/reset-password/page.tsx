'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setReady(Boolean(data.session)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message); else setDone(true)
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-16"><section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
    {done ? <div className="mt-5"><p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your password has been updated.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Continue to sign in</Link></div>
    : !ready ? <div className="mt-5"><p role="alert" className="text-sm leading-6 text-slate-600">Open the latest password reset link from your email. Reset links expire for your security.</p><Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-blue-600">Request a new link</Link></div>
    : <form onSubmit={submit} className="mt-6 space-y-4">
      <div><label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-slate-700">New password</label><input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
      <div><label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
    </form>}
  </section></main>
}
