import Link from 'next/link'

export default function PublicInfoLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-700">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2.5 font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">H</span>
            Hirely
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
            <Link href="/support" className="hover:text-blue-600">Support</Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Hirely</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">Last updated {updated}</p>
          <div className="mt-9 space-y-8 text-sm leading-7 [&_a]:font-semibold [&_a]:text-blue-600 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
            {children}
          </div>
        </div>
      </article>
    </main>
  )
}
