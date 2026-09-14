import type { Metadata } from 'next'
import PublicInfoLayout from '@/components/PublicInfoLayout'

export const metadata: Metadata = { title: 'Terms of Service | Hirely', description: 'Terms for using the Hirely service.' }

export default function TermsPage() {
  return (
    <PublicInfoLayout title="Terms of Service" updated="September 14, 2026">
      <section><h2>Using Hirely</h2><p>You must provide accurate account information, protect your sign-in credentials, and use Hirely only for lawful business purposes. You are responsible for the contacts, messages, notes, recordings, and other material you add or create.</p></section>
      <section><h2>Responsible outreach</h2><p>You must have a lawful basis and any required consent for collecting contact data and sending outreach. You must honor opt-outs and comply with applicable privacy, anti-spam, employment, and communications laws. Hirely does not guarantee that a found or predicted email address is accurate, current, deliverable, or appropriate to contact.</p></section>
      <section><h2>Plans and usage</h2><p>Plans may include monthly limits for email searches, verification, AI, transcription, or other paid features. A request may count when a provider search starts even when it returns no result. Current pricing and included limits are shown before purchase. Subscription cancellation applies to future renewals unless stated otherwise at checkout.</p></section>
      <section><h2>Your content</h2><p>You keep ownership of content you submit. You give Hirely permission to process that content only as needed to operate, secure, and improve the requested service. Do not submit information you are not authorized to use.</p></section>
      <section><h2>Third-party services</h2><p>Hirely can connect to services such as LinkedIn, Outlook, email-data providers, AI providers, and payment processors. Their own terms and policies apply. Hirely is not affiliated with or endorsed by LinkedIn, Microsoft, Hunter, Anthropic, or OpenAI unless expressly stated.</p></section>
      <section><h2>Availability and changes</h2><p>We work to keep Hirely reliable, but the service may occasionally be unavailable or change as we improve it. Features that depend on third-party websites or providers may stop working when those services change.</p></section>
      <section><h2>Suspension and termination</h2><p>We may restrict or end access for abuse, unlawful use, security risk, non-payment, or a material breach of these terms. You may stop using Hirely and request account deletion by contacting support.</p></section>
      <section><h2>Contact</h2><p>Questions about these terms can be sent to <a href="mailto:jay@hirelypro.com">jay@hirelypro.com</a>.</p></section>
    </PublicInfoLayout>
  )
}
