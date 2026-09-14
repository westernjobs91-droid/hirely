# Extension update 1.0.2

Changes: non-modal panel stays open while browsing profiles and search pages; removed visible scraper/version labels; free email prediction refreshes expired sessions and displays cache-miss/error messages; known email field remains editable; profile image URL saved on new contacts and via an explicit button for existing contacts. CRM list, cards, and details display the image, with initials on loading failure.

The manual email field is optional because a contact can be saved without email. It does not verify a mailbox. Free prediction needs a saved company pattern or cached address; it does not automatically spend Hunter credits when none exists.

Deployment order:
1. Run supabase/migrations/20260914_contact_photos.sql in the intended database. It adds contacts.photo_url and leaves the existing ownership policies in place.
2. Deploy the CRM changes so saved photos can be displayed.
3. Reload the unpacked extension from /Users/jeysingh/projects/hirely/hirely-extension in Chrome Extensions, then refresh LinkedIn tabs. A website deployment does not update an unpacked Chrome extension.
4. Open a profile with a visible photo, save a test contact, and confirm the CRM image. Existing contacts have a Save profile photo button. Browse to search results and another profile without closing the panel; verify the current name/company before saving.

Image links can expire or become inaccessible when LinkedIn changes them; this release stores the URL, not a permanent image copy. Revisit the profile and save its photo again when needed. No image-download host permission was added. Content-script matching now covers LinkedIn pages so the panel survives full navigation through search/feed pages; the existing LinkedIn host permission is unchanged.

Validation: production build, TypeScript, extension syntax checks, existing email/Meet tests, and extension regression tests for expired/concurrent sessions, free-only lookup, photo ownership/validation, and keeping the panel open across navigation. Updated extension behavior on real LinkedIn remains to be checked after migration and extension reload. No live database migration or website deployment was performed for this update.
