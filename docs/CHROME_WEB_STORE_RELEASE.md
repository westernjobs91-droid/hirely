# Hirely Chrome Web Store release

## Package

Run `npm run package:extension`. Upload the generated `dist/hirely-extension-1.3.0.zip`. The package contains only the runtime files and icons; source backups and macOS metadata are excluded.

## Store listing

**Name:** Hirely — Save LinkedIn Contacts

**Summary:** Review and save LinkedIn profile details to your Hirely recruiting CRM.

**Detailed description:**

Hirely helps recruiters capture a LinkedIn profile into their Hirely CRM while they research candidates, clients, and hiring contacts.

- Review the person’s name, current role, company, LinkedIn URL, and profile photo before saving.
- Keep the Hirely panel available while moving between LinkedIn profiles and search pages.
- See whether the profile is already in your pipeline.
- Save contacts directly to your own Hirely workspace.
- Request a work-email search when needed, with the credit cost shown before the search starts.

A Hirely account is required. Hirely is not affiliated with or endorsed by LinkedIn.

**Category:** Productivity

**Language:** English

**Website:** https://app.hirelypro.com

**Support:** https://app.hirelypro.com/support

**Privacy policy:** https://app.hirelypro.com/privacy

## Single purpose

Hirely lets a signed-in recruiter review visible LinkedIn profile information and save the selected contact to that recruiter’s Hirely CRM.

## Permission justifications

**storage:** Stores the signed-in Hirely session, whether the panel should remain open, and recent extension activity on the user’s device.

**Host access — linkedin.com:** Displays the Hirely contact-capture panel and reads visible profile or company fields for user review.

**Host access — app.hirelypro.com:** Sends authenticated contact saves and user-confirmed email searches to Hirely and opens Hirely account pages.

**Host access — Supabase project:** Authenticates the Hirely account and saves or checks contacts in the signed-in user’s protected CRM records.

No `activeTab`, `tabs`, or `scripting` permission is requested.

## Privacy form answers

Declare these data types because the extension handles them:

- Personally identifiable information: account email and LinkedIn profile/contact details.
- Authentication information: Hirely access and refresh tokens stored locally; passwords are transmitted to the authentication provider and are not stored by the extension.
- Website content: visible LinkedIn profile and company fields used for contact capture.
- User activity: the current LinkedIn profile URL is checked against the user’s CRM while the panel is open.

Data is used for the extension’s contact-capture and user-requested email-finding features. It is not sold, used for advertising, or used for unrelated credit or eligibility decisions. Review the published privacy policy before answering the dashboard attestations.

## Reviewer instructions

1. Use the reviewer account supplied privately in the Chrome Web Store Test Instructions tab.
2. Open the toolbar icon and sign in.
3. Visit a LinkedIn member profile.
4. Open the blue Hirely tab on the right edge of the page.
5. Review the captured fields and save the contact.
6. Open https://app.hirelypro.com and confirm the contact appears in Contacts.
7. Move to LinkedIn search results and then another member profile; the panel should remain available and refresh to the current person.

Do not place reviewer credentials in the public description or source package.

## Required visual assets

- Store icon: existing 128 × 128 Hirely icon.
- Five screenshots at 1280 × 800 using a demo workspace with fictional contacts: profile capture, field review, saved confirmation, profile switching, and the CRM contact record.
- Small promotional tile: 440 × 280.
- Optional marquee image: 1400 × 560.

Do not publish screenshots containing real customer, candidate, or LinkedIn member data without permission.

## Submission sequence

1. Deploy and verify `/privacy`, `/terms`, and `/support` publicly without sign-in.
2. Test the packed version in a clean Chrome profile with a dedicated reviewer account.
3. Capture store screenshots with fictional demo data.
4. Register or complete the Chrome Web Store developer account.
5. Upload the ZIP and complete Store Listing, Privacy, Distribution, and Test Instructions.
6. Choose deferred publishing when submitting for review so approval does not launch the extension before the production checklist is complete.
