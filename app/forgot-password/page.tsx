'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    if (error) setError(error.message)
    else setMessage('If an account exists for this email, a password reset link is on its way.')
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-16">
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Link href="/login" className="text-sm font-medium text-blue-600">← Back to sign in</Link>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Enter your account email and we’ll send you a secure reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label>
          <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </section>
  </main>
}
