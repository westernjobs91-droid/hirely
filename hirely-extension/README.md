# Hirely contact-capture extension 1.4.2
The extension reads the visible LinkedIn profile or the sender/recipient header of an open Gmail message, lets the recruiter review the fields, and saves the contact to Supabase under their account.
Gmail capture does not use the Gmail API, scan the inbox, read the message body, or request Google OAuth scopes.
Opening a profile does not call Hunter. Predict Email uses the shared backend resolver, which checks saved data and company patterns without a paid provider call.
Optional paid finding and verification are available in the dashboard Email finder. Predictions stay marked unverified.
Company details are read from the company cache. Add missing company domains and patterns through the admin page.
Reload this unpacked extension after deploying the application and applying the database migration.
See ../docs/EMAIL_AND_MEET_RELEASE.md for deployment order, configuration and remaining recording/transcription work.
Build the Chrome Web Store ZIP with `npm run package:extension`. See ../docs/CHROME_WEB_STORE_RELEASE.md for the listing, privacy disclosures and reviewer steps.
