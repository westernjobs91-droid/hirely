'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'growwithjey@gmail.com'

interface CacheEntry {
  id: string
  cache_key: string
  company_name: string
  data: {
    domain?: string
    pattern?: string
    industry?: string
    size?: string
    location?: string
    website?: string
  }
  created_at: string
}

const PATTERNS = [
  { label: 'first.last', value: '{first}.{last}' },
  { label: 'firstlast', value: '{first}{last}' },
  { label: 'first', value: '{first}' },
  { label: 'flast', value: '{f}{last}' },
  { label: 'first_last', value: '{first}_{last}' },
  { label: 'lastfirst', value: '{last}{first}' },
  { label: 'Custom', value: 'custom' },
]

export default function AdminSeedPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<CacheEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    companyName: '',
    domain: '',
    patternSelect: '{first}.{last}',
    patternCustom: '',
    industry: '',
    size: '',
    location: '',
  })

  const pattern = form.patternSelect === 'custom' ? form.patternCustom : form.patternSelect

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/')
        return
      }
      setAuthorized(true)
      await loadEntries()
      setLoading(false)
    }
    check()
  }, [])

  async function loadEntries() {
    const { data } = await supabase
      .from('company_cache')
      .select('*')
      .order('created_at', { ascending: false })
    setEntries((data || []) as CacheEntry[])
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function resetForm() {
    setForm({ companyName: '', domain: '', patternSelect: '{first}.{last}', patternCustom: '', industry: '', size: '', location: '' })
    setEditingId(null)
  }

  function startEdit(entry: CacheEntry) {
    const p = entry.data.pattern || '{first}.{last}'
    const isKnown = PATTERNS.some(x => x.value === p && x.value !== 'custom')
    setForm({
      companyName: entry.company_name,
      domain: entry.data.domain || '',
      patternSelect: isKnown ? p : 'custom',
      patternCustom: isKnown ? '' : p,
      industry: entry.data.industry || '',
      size: entry.data.size || '',
      location: entry.data.location || '',
    })
    setEditingId(entry.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.companyName.trim() || !form.domain.trim()) {
      showToast('Company name and domain are required', false)
      return
    }
    setSaving(true)
    const cacheKey = form.companyName.toLowerCase().trim()
    const data = {
      domain: form.domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
      pattern: pattern || undefined,
      industry: form.industry.trim() || undefined,
      size: form.size.trim() || undefined,
      location: form.location.trim() || undefined,
      website: form.domain.trim() ? `https://${form.domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : undefined,
    }

    const { error } = await supabase.from('company_cache').upsert({
      cache_key: cacheKey,
      company_name: form.companyName.trim(),
      data,
      expires_at: '2099-01-01T00:00:00.000Z',
    }, { onConflict: 'cache_key' })

    setSaving(false)
    if (error) { showToast('Failed to save: ' + error.message, false); return }
    showToast(editingId ? 'Updated' : 'Saved')
    resetForm()
    await loadEntries()
  }

  async function handleDelete(cacheKey: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('company_cache').delete().eq('cache_key', cacheKey)
    showToast('Deleted')
    await loadEntries()
  }

  const filtered = entries.filter(e =>
    !search || e.company_name.toLowerCase().includes(search.toLowerCase()) || e.data.domain?.includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Company Cache</h1>
            <p className="text-sm text-slate-400 mt-0.5">{entries.length} companies seeded</p>
          </div>
          <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Back to dashboard
          </button>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">
            {editingId ? 'Edit entry' : 'Add company'}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company name *</label>
              <input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Johnston Equipment"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Domain *</label>
              <input
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="johnstonequipment.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email pattern</label>
              <select
                value={form.patternSelect}
                onChange={e => setForm(f => ({ ...f, patternSelect: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              >
                {PATTERNS.map(p => (
                  <option key={p.value} value={p.value}>{p.label} {p.value !== 'custom' ? `→ e.g. john.smith@domain.com`.replace('john', '{first}').replace('smith', '{last}').replace('{first}', 'john').replace('{last}', 'smith') : ''}</option>
                ))}
              </select>
              {form.patternSelect === 'custom' && (
                <input
                  value={form.patternCustom}
                  onChange={e => setForm(f => ({ ...f, patternCustom: e.target.value }))}
                  placeholder="{first}.{last}"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 mt-2 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
              )}
              {pattern && form.domain && (
                <p className="text-[10px] text-blue-500 mt-1">
                  Preview: {pattern.replace('{first}', 'john').replace('{last}', 'smith').replace('{f}', 'j')}@{form.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Industry</label>
              <input
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="Equipment Rental"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company size</label>
              <input
                value={form.size}
                onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                placeholder="201-500"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Toronto, Ontario, Canada"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save company'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-bold text-slate-600">Seeded companies</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-300 w-48"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">No companies seeded yet</p>
              <p className="text-xs text-slate-300 mt-1">Add your first company above</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(entry => (
                <div key={entry.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors group">
                  <div>
                    <p className="text-[12.5px] font-semibold text-slate-800">{entry.company_name}</p>
                    <p className="text-[10.5px] text-slate-400">{entry.data.industry || '-'}</p>
                  </div>
                  <p className="text-[11.5px] text-slate-600 font-medium">{entry.data.domain || '-'}</p>
                  <p className="text-[11px] text-blue-600 font-mono">{entry.data.pattern || '-'}</p>
                  <p className="text-[10.5px] text-slate-400">{entry.data.location || '-'}</p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.cache_key)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-t border-slate-50 bg-slate-50">
            {['Company', 'Domain', 'Pattern', 'Location', ''].map(h => (
              <span key={h} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
