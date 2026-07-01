'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', company: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.firstName || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    // TODO: connect Supabase auth here
    setTimeout(() => {
      setLoading(false)
      window.location.href = '/'
    }, 1400)
  }

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500']

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 100%)' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563EB)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 19 19" fill="none" className="w-5 h-5">
              <rect x="1" y="1" width="4.5" height="17" fill="white"/>
              <rect x="13.5" y="1" width="4.5" height="17" fill="white"/>
              <polygon points="5.5,7.5 13.5,7.5 13.5,11.5 5.5,11.5" fill="white"/>
              <polygon points="11.5,6 16,9.5 11.5,13" fill="white"/>
            </svg>
          </div>
          <span className="text-white text-lg font-semibold tracking-tight">Hirely</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-white text-xs font-medium">Free during beta - no credit card needed</span>
          </div>
          <h1 className="text-white text-4xl font-bold leading-tight tracking-tight mb-4">
            Your recruiter<br />superpower awaits.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10">
            Join recruiters who place more candidates and never miss a follow-up again.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '40%', label: 'More placements' },
              { num: '3hrs', label: 'Saved per week' },
              { num: '2x', label: 'Reply rate' },
              { num: '0', label: 'Missed follow-ups' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl p-4">
                <p className="text-white text-2xl font-bold tracking-tight">{stat.num}</p>
                <p className="text-blue-200 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {['#2563EB','#7C3AED','#059669','#D97706'].map((c,i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-blue-800 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c }}>
                {['JR','AS','MK','TC'][i]}
              </div>
            ))}
          </div>
          <p className="text-blue-200 text-xs"><span className="text-white font-semibold">47 recruiters</span> already on the waitlist</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)' }}>
              <svg viewBox="0 0 19 19" fill="none" className="w-5 h-5">
                <rect x="1" y="1" width="4.5" height="17" fill="white"/>
                <rect x="13.5" y="1" width="4.5" height="17" fill="white"/>
                <polygon points="5.5,7.5 13.5,7.5 13.5,11.5 5.5,11.5" fill="white"/>
                <polygon points="11.5,6 16,9.5 11.5,13" fill="white"/>
              </svg>
            </div>
            <span className="text-slate-900 text-lg font-semibold">Hirely</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm">Free during beta. No credit card needed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">First name <span className="text-red-400">*</span></label>
                <input
                  value={form.firstName}
                  onChange={e => setForm({...form, firstName: e.target.value})}
                  placeholder="Jey"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">Last name</label>
                <input
                  value={form.lastName}
                  onChange={e => setForm({...form, lastName: e.target.value})}
                  placeholder="Singh"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">Work email <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="jey@westernstaffing.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">Company name</label>
              <input
                value={form.company}
                onChange={e => setForm({...form, company: e.target.value})}
                placeholder="Western Staffing"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating your account...
                </>
              ) : 'Create free account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
            <div className="relative flex justify-center"><span className="bg-slate-50 px-3 text-xs text-slate-400">or</span></div>
          </div>

          <button className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:bg-white transition-colors bg-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <p className="text-center text-xs text-slate-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">
              Sign in
            </Link>
          </p>

          <p className="text-center text-[10px] text-slate-400 mt-3">
            By creating an account you agree to our{' '}
            <a href="#" className="underline">Terms</a> and{' '}
            <a href="#" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
