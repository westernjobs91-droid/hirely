import type { Metadata } from 'next'
import PublicInfoLayout from '@/components/PublicInfoLayout'

export const metadata: Metadata = { title: 'Support | Hirely', description: 'Get help with Hirely and its browser extension.' }

export default function SupportPage() {
  return (
    <PublicInfoLayout title="Support" updated="September 14, 2026">
      <section><h2>Get help</h2><p>Email <a href="mailto:jay@hirelypro.com">jay@hirelypro.com</a> with a short description of the issue, the page where it happened, and the browser you use. Do not send passwords or API keys.</p></section>
      <section><h2>Chrome extension setup</h2><ul><li>Install Hirely from the Chrome Web Store and pin it to the toolbar.</li><li>Open the Hirely toolbar icon and sign in.</li><li>Visit a LinkedIn profile and open the Hirely tab on the right side.</li><li>Review the captured name, role, company, profile URL, and photo before saving.</li></ul></section>
      <section><h2>Extension troubleshooting</h2><ul><li>Refresh the LinkedIn page after installing or updating Hirely.</li><li>Confirm you are signed in if saving or email search is unavailable.</li><li>LinkedIn changes its page regularly; edit any uncertain fields before saving.</li><li>An email search uses one Hirely email credit when the search begins, including when no address is found.</li></ul></section>
      <section><h2>Privacy and account requests</h2><p>See the <a href="/privacy">Privacy Policy</a> for data details. Use the same support email to request account-data access, correction, export, or deletion.</p></section>
    </PublicInfoLayout>
  )
}
