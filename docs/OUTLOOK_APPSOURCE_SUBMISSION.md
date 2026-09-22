# Outlook AppSource submission package

This file contains the copy and checks needed to publish the current-message capture add-in. Do not describe mailbox synchronization, automatic reply tracking, or calendar sync in this listing; those features are not in this add-in.

## Partner Center values

- Offer type: Microsoft 365 / Office add-in
- Pricing: Free add-in; Hirely account and paid plan may be required for saving
- Product name: Hirely for Outlook
- Manifest: `public/outlook/manifest.xml`
- Privacy URL: `https://app.hirelypro.com/privacy`
- Support URL: `https://app.hirelypro.com/support`
- Terms URL: `https://app.hirelypro.com/terms`
- Website: `https://hirelypro.com`
- Category: Productivity / CRM
- Markets: begin with Canada and United States
- Language: English

The verified Partner Center publisher name must match or closely match the manifest's `ProviderName`. Confirm that value before submission and keep the manifest ID unchanged after the first submission.

## Listing copy

### Short description

Save the sender or recipient of an open Outlook email to your Hirely recruiting pipeline.

### Description

Hirely helps independent recruiters capture contacts and organize follow-ups without copying details between Outlook and their CRM.

Open a message, choose **Save to Hirely**, review the sender or first recipient, add a company or title when known, and save the contact to your pipeline. Hirely checks for an existing or trashed contact before saving.

The add-in reads the name and email address associated with the message you open. It does not scan the mailbox, continuously synchronize email, or save the message body.

A Hirely account is required. Outlook contact capture is included with Hirely Solo and Pro plans. Review of the detected contact is available before saving.

### Search terms

Recruiting, recruiter CRM, candidate sourcing, contact capture, follow-up, talent acquisition

## Reviewer instructions

1. Sign in with the dedicated Microsoft certification test account supplied privately in Partner Center.
2. Open any received message with a named external sender.
3. Open **Apps**, select **Hirely**, and choose **Save to Hirely**.
4. Sign in with the dedicated verified Hirely Solo or Pro reviewer account supplied privately in Partner Center.
5. Confirm the task pane shows the sender name and email, with editable company and title fields.
6. Select **Save to Hirely** and confirm the success state.
7. Open the Hirely dashboard and confirm the contact appears under Coming up.
8. Reopen the same message and confirm Hirely reports the existing contact instead of creating a duplicate.

Never commit reviewer passwords or provider credentials to this repository.

## Screenshot set

Prepare clean screenshots at the dimensions requested by Partner Center:

1. Outlook message with the Hirely command visible.
2. Hirely task pane showing the detected contact before saving.
3. Successful save state.
4. Hirely dashboard showing the captured contact in Coming up.

Use invented test contacts and messages. Do not show real customer, candidate, or mailbox data.

## Technical checks

- [x] Manifest uses HTTPS production URLs.
- [x] Manifest declares the minimum `ReadItem` permission.
- [x] Office.js loads from Microsoft's required CDN.
- [x] Support URL is present.
- [x] Store icon references use 64×64 and 128×128 PNG assets.
- [x] Outlook task-pane HTML is embeddable; the rest of Hirely retains `X-Frame-Options: DENY`.
- [x] Public privacy, support, and terms pages describe the released behavior.
- [ ] Deploy the updated manifest, icon, header, and public pages.
- [ ] Run `npx --yes office-addin-manifest validate -p public/outlook/manifest.xml` after deployment.
- [ ] Confirm all manifest URLs return HTTP 200 without redirects.
- [ ] Confirm icon responses permit production caching.
- [ ] Complete the platform/account test matrix.
- [ ] Create private reviewer accounts and test data.
- [ ] Capture listing screenshots.
- [ ] Submit through the verified Partner Center publisher account.

Allow up to four weeks for first review and correction cycles. An initial rejection for a correctable listing or test issue should be handled as a release task, not by broadening add-in permissions.

