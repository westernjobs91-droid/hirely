'use client'

export default function IntegrationsView() {
  return (
    <div className="px-5 py-4 space-y-5">

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-0.5">Integrations</h2>
        <p className="text-[11.5px] text-slate-400 mb-4">Connect your tools to capture contacts and automate follow-ups.</p>

        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Capture tools</p>
        <div className="grid grid-cols-2 gap-4">

          {/* Chrome Extension */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900">Chrome Extension</p>
                  <p className="text-[10px] text-slate-400">LinkedIn contact capture</p>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed mb-4">
              Browse LinkedIn profiles and save contacts to Hirely with one click. Captures name, title, company, and LinkedIn URL instantly.
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">How to install</p>
              <ol className="space-y-1.5">
                {[
                  'Download the extension file from the link below',
                  'Go to chrome://extensions in your browser',
                  'Enable Developer Mode (top right toggle)',
                  'Click "Load unpacked" and select the extension folder',
                  'Pin Hirely to your toolbar and log in',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[11px] text-slate-500">{step}</span>
                  </li>
                ))}
              </ol>
              <a
                href="mailto:jay@hirelypro.com?subject=Hirely Extension Download"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Get the extension
              </a>
            </div>
          </div>

          {/* Outlook Add-in */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900">Outlook Add-in</p>
                  <p className="text-[10px] text-slate-400">Email contact capture</p>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed mb-4">
              Save contacts directly from your Outlook inbox. Opens on any email and captures the sender with one click.
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">How to install</p>
              <ol className="space-y-1.5">
                {[
                  'Open Outlook on your desktop or web browser',
                  'Go to Home → Get Add-ins (or More Apps)',
                  'Click "My add-ins" → "Add a custom add-in"',
                  'Choose "Add from URL" and paste the manifest link',
                  'Hirely will appear in your Outlook toolbar',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[11px] text-slate-500">{step}</span>
                  </li>
                ))}
              </ol>
              <a
                href={`https://app.hirelypro.com/outlook/manifest.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11.5px] font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Get the manifest URL
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Help */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-slate-700">Need help setting up?</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Email us and we will get you set up within 24 hours.</p>
        </div>
        <a href="mailto:jay@hirelypro.com" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11.5px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap">
          Contact support
        </a>
      </div>

    </div>
  )
}
