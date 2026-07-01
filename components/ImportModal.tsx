'use client'

interface ImportModalProps {
  onClose: () => void
}

const sources = [
  { icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', color: '#0A66C2', label: 'From LinkedIn', sub: 'Via Chrome extension', isBrand: true },
  { icon: 'M0 3.449L9.75 9.949v13.6H0zM10.949 9.949L20.699 3.449V23.55H10.949z M0 2.6L10.949 9 21.9 2.6 10.949 0z', color: '#0078D4', label: 'From Outlook', sub: 'Via Outlook add-in', isBrand: true },
  { icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#16A34A', label: 'CSV / Excel', sub: 'Bulk import', isBrand: false },
  { icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', color: '#7C3AED', label: 'API / Zapier', sub: 'Connect any tool', isBrand: false },
]

export default function ImportModal({ onClose }: ImportModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl border border-gray-100 w-[420px] max-w-[96vw] shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <h2 className="text-sm font-medium text-gray-900">Import contacts</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {sources.map((src, i) => (
              <button key={i} className="border border-gray-100 rounded-lg p-4 text-center hover:border-gray-200 hover:bg-gray-50 transition-all text-left">
                <div className="flex justify-center mb-3">
                  {src.isBrand ? (
                    <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ fill: src.color }}>
                      <path d={src.icon} />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7" fill="none" stroke={src.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={src.icon} />
                    </svg>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-900 text-center">{src.label}</p>
                <p className="text-[10px] text-gray-400 text-center mt-0.5">{src.sub}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 text-center">All imports auto-enriched with Hunter.io and Apollo data</p>
        </div>

        <div className="flex justify-end px-5 py-3.5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}
