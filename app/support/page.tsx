import type { Metadata } from 'next'
import PublicInfoLayout from '@/components/PublicInfoLayout'

export const metadata: Metadata = { title: 'Support | Hirely', description: 'Get help with Hirely and its integrations.' }

export default function SupportPage() {
  return (
    <PublicInfoLayout title="Support" updated="September 22, 2026">
      <section><h2>Get help</h2><p>Email <a href="mailto:jay@hirelypro.com">jay@hirelypro.com</a> with a short description of the issue, the page where it happened, and the browser you use. Do not send passwords or API keys.</p></section>
      <section><h2>Chrome extension setup</h2><ul><li>Install Hirely from the Chrome Web Store and pin it to the toolbar.</li><li>Open the Hirely toolbar icon and sign in.</li><li>Visit a LinkedIn profile and open the Hirely tab on the right side.</li><li>Review the captured name, role, company, profile URL, and photo before saving.</li></ul></section>
      <section><h2>Extension troubleshooting</h2><ul><li>Refresh the LinkedIn page after installing or updating Hirely.</li><li>Confirm you are signed in if saving or email search is unavailable.</li><li>LinkedIn changes its page regularly; edit any uncertain fields before saving.</li><li>An email search uses one Hirely email credit only when an email address is returned.</li></ul></section>
      <section><h2>Outlook add-in setup</h2><ul><li>Open Integrations in Hirely and download the Outlook manifest.</li><li>In Outlook, open Apps or Get Add-ins, then My add-ins and add the manifest from a file.</li><li>Open a message and choose <strong>Save to Hirely</strong> from Apps.</li><li>Some Microsoft 365 organizations block custom add-ins. Ask your Microsoft 365 administrator to deploy the manifest centrally while Hirely&apos;s AppSource listing is being prepared.</li></ul><p className="mt-3">The current add-in captures the open message&apos;s sender or first recipient. It does not synchronize the mailbox or message body.</p></section>
      <section><h2>Gmail capture</h2><ul><li>Open an individual Gmail message.</li><li>Select the blue Hirely tab on the right edge.</li><li>Review the detected sender or recipient, then save.</li><li>If Hirely cannot detect a person, expand the individual message and reopen the panel.</li></ul><p className="mt-3">Gmail capture reads the visible message header only. It does not scan the inbox, read the message body, or connect through the Gmail API.</p></section>
      <section><h2>Privacy and account requests</h2><p>See the <a href="/privacy">Privacy Policy</a> for data details. Use the same support email to request account-data access, correction, export, or deletion.</p></section>
    </PublicInfoLayout>
  )
}
