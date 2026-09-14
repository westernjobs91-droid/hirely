import type { Metadata } from 'next'
import PublicInfoLayout from '@/components/PublicInfoLayout'

export const metadata: Metadata = { title: 'Privacy Policy | Hirely', description: 'How Hirely collects, uses, and protects data.' }

export default function PrivacyPage() {
  return (
    <PublicInfoLayout title="Privacy Policy" updated="September 14, 2026">
      <section>
        <h2>What Hirely collects</h2>
        <p>Hirely processes the information you add to the CRM, including contact names, job titles, companies, work contact details, LinkedIn profile URLs, profile photo URLs, notes, follow-up activity, meeting notes, and email drafts. We also process your account email, authentication information, subscription and usage records, and basic technical logs needed to operate and secure the service.</p>
      </section>
      <section>
        <h2>Chrome extension data</h2>
        <p>The Hirely extension runs only on LinkedIn pages. When its panel is open, it reads visible profile or company information so you can review it and checks the profile URL against your Hirely account. Profile information is saved to Hirely only when you choose to save it. A confirmed email search sends the person&apos;s name and company or domain to Hirely and may send that search to our email-data provider.</p>
        <p className="mt-3">The extension stores an authentication session and panel preferences in Chrome local storage. Your password is sent securely to our authentication provider for sign-in and is not stored by the extension.</p>
      </section>
      <section>
        <h2>How information is used</h2>
        <ul>
          <li>Provide contact capture, CRM, email-finding, follow-up, analytics, and meeting features you request.</li>
          <li>Authenticate accounts, apply plan limits, prevent abuse, and protect the service.</li>
          <li>Maintain, troubleshoot, and improve Hirely.</li>
          <li>Respond to support and account requests.</li>
        </ul>
        <p className="mt-3">Hirely does not sell personal information or use extension data for advertising, credit decisions, or unrelated profiling.</p>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>We use service providers to host the application and database, authenticate users, process payments, provide requested email searches or verification, and generate requested AI or transcription results. These providers receive only the information needed to perform the requested service. Paid email searching may use Hunter. AI and transcription features may use Anthropic or OpenAI.</p>
      </section>
      <section>
        <h2>Chrome Web Store Limited Use</h2>
        <p>Hirely&apos;s use and transfer of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including its Limited Use requirements. We use this information only to provide or improve the user-facing Hirely features described above.</p>
      </section>
      <section>
        <h2>Storage, security, and retention</h2>
        <p>Data is transmitted over HTTPS. Account data is separated using account-level access controls. We retain CRM information while your account is active or as needed to provide the service, meet legal obligations, resolve disputes, and protect the service. Logging out removes the extension&apos;s locally stored authentication session. Removing the extension also allows Chrome to clear its local extension storage.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You can review, edit, and delete CRM contacts in Hirely. You can avoid provider searches by not selecting an email-search action. To request access, correction, export, or deletion of your account information, email <a href="mailto:jay@hirelypro.com">jay@hirelypro.com</a>.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about this policy or Hirely&apos;s data practices can be sent to <a href="mailto:jay@hirelypro.com">jay@hirelypro.com</a>.</p>
      </section>
    </PublicInfoLayout>
  )
}
