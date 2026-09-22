# Hirely email integrations plan

Status: approved direction, implementation started September 22, 2026.

## Product decision

Hirely will ship email integrations in layers. Capturing the open message, sending through a connected mailbox, and continuously synchronizing a mailbox are separate capabilities with different permissions and compliance costs.

The first release will make the existing Outlook current-message capture installable for Microsoft 365 organizations. Gmail will start with a lightweight Chrome workflow that only handles the message the recruiter opens. Full Gmail inbox synchronization is deferred until paid demand justifies Google's restricted-scope verification and any independent security assessment.

## Plan packaging

| Capability | Free | Solo ($29/month) | Pro ($59/month) |
| --- | --- | --- | --- |
| LinkedIn capture | Included | Included | Included |
| Gmail current-message capture | Included | Included | Included |
| Outlook current-message capture | Preview only | Included | Included |
| Connected sending mailbox | No | 1 | Up to 3 |
| Reply detection | No | 1 mailbox when released | Up to 3 when released |
| Calendar synchronization | No | No | Included when released |

No email-finder credit is used for mailbox capture or connected sending. Existing active-contact limits still apply.

## Phase 0 — product truth and submission readiness

- [x] Separate current-message capture from connected-mailbox promises.
- [x] Document the permission and cost boundaries.
- [x] Update privacy, support, and terms language so it matches current behavior.
- [ ] Replace beta-only installation copy after the AppSource listing is approved.
- [ ] Prepare the AppSource listing description, screenshots, icons, test instructions, privacy URL, support URL, and terms URL.
- [x] Validate the production manifest and its HTTPS endpoints.

Exit: every public claim matches the behavior reviewers and customers can test.

## Phase 1 — Outlook organization-compatible capture

The existing Office add-in reads only the open message's sender or first recipient through Office.js. It does not scan the mailbox or save the body.

- Register and verify Hirely as a Microsoft Marketplace publisher.
- Submit the Outlook add-in to Microsoft AppSource as a free add-in; keep Hirely subscriptions in Stripe.
- Test new Outlook, classic Outlook where supported, Outlook on the web, Windows, and macOS.
- Test a personal Microsoft account and at least one Microsoft 365 organization with admin deployment.
- Add an in-product AppSource installation action and organization-admin instructions.
- Keep the downloadable XML manifest for internal testing and centralized deployment.

Exit: an organization can install Hirely through AppSource or have its admin deploy it without allowing user-sideloaded custom add-ins.

## Phase 2 — Microsoft connected sending

Use Microsoft identity platform authorization-code flow with PKCE. Start with the minimum delegated permissions needed for sign-in and sending: `openid`, `profile`, `email`, `offline_access`, `User.Read`, and `Mail.Send`. Do not request mailbox-reading permission in this phase.

- Add a server-side connection table with provider, Microsoft tenant/account identifiers, encrypted refresh credentials, granted scopes, expiry, status, and timestamps.
- Add state, PKCE, callback, refresh, disconnect, and revocation handling.
- Never return provider refresh credentials to the browser.
- Add a connection-status card and a clear consent explanation.
- Send a draft from Hirely through the recruiter's connected account and record only Hirely's send event and provider message identifier.
- Enforce one connected mailbox on Solo and three on Pro.

Exit: a paid user can connect, send, reconnect, and disconnect safely without Hirely receiving the mailbox password.

## Phase 3 — Microsoft reply detection

Request additional read permission only when the user enables reply tracking. Confirm the smallest Microsoft Graph permission that supports the required message subscriptions during implementation; do not add broad mailbox access speculatively.

- Subscribe only to the connected user's mailbox events required for reply detection.
- Store message/conversation identifiers and delivery state; avoid storing message bodies by default.
- Validate webhook signatures/client state, renew subscriptions, deduplicate events, and back off on throttling.
- Show connection-health and last-synchronized timestamps.
- Stop synchronization promptly after disconnect or subscription cancellation.

Exit: replies update the correct Hirely contact and follow-up state reliably, including renewal and failure recovery.

## Phase 4 — Gmail lightweight workflow

- Extend the Chrome extension to recognize an open Gmail message.
- Read only the visible sender/recipient, display name, email address, and subject needed for the user-requested action.
- Require review before saving a contact.
- Start outreach with a Gmail compose link or local compose helper; do not scan the inbox.
- Use clear Gmail-specific unavailable/error states and duplicate checks.

Exit: Gmail users can capture the person in the open message without granting Hirely broad Gmail API access.

## Phase 5 — Google connected sending, then optional synchronization

Connected Gmail sending will be a separate consent flow from Google sign-in to Hirely. Start with send-only access. Full inbox/reply synchronization remains a later business decision because restricted Gmail scopes can trigger verification and an annual independent security assessment when data passes through Hirely servers.

Before full sync:

- Measure how many paid customers request it.
- Obtain a written assessment quote and verification timeline.
- Complete provider-token encryption, deletion, incident-response, and access-audit controls.
- Update privacy disclosures and obtain explicit user consent.
- Make the feature remotely disableable without affecting CRM access.

Exit: proceed only when expected subscription revenue covers compliance, support, and infrastructure costs.

## Release checks for every phase

- Personal and organization-managed account tests.
- Successful consent, denied consent, expired token, revoked token, tenant-admin approval, and provider outage states.
- Mobile dashboard layout and keyboard-accessible controls.
- No success message before the provider and Hirely database both confirm the operation.
- Idempotent callbacks/webhooks and no duplicate contacts or activity entries.
- Disconnect removes the usable provider credential and stops future work.
- Public pricing, integrations, privacy, support, and terms pages agree with the released behavior.

## Cost controls

- Keep Stripe as the subscription system instead of transacting through Microsoft Marketplace.
- Prefer event subscriptions over frequent polling when synchronization is introduced.
- Store metadata required for CRM state, not entire mailboxes or attachments.
- Put mailbox counts behind plan entitlements and add per-account rate limits.
- Keep full Gmail synchronization behind a separate launch decision.
