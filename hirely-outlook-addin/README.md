# Hirely Outlook Add-in

Adds a "Save to Hirely" button to the ribbon when reading an email. Click it, and a task pane opens showing the sender's name and email (pulled straight from the message), ready to save into your Hirely pipeline.

## How it works

- These files are hosted as static pages inside your existing Next.js app (`public/outlook/`), so once deployed they're live at:
  - `https://hirely-ten-rho.vercel.app/outlook/manifest.xml`
  - `https://hirely-ten-rho.vercel.app/outlook/taskpane.html`
- `manifest.xml` is the file Outlook reads to know the add-in exists — it points at `taskpane.html` and tells Outlook to show a button in the ribbon when reading a message.
- `taskpane.html` is a self-contained page (like the Chrome extension's panel) that uses Microsoft's Office.js API to read the currently-open email's sender name, email address, and body text, then lets you review/edit and save straight to Supabase — same direct-write approach as the Chrome extension, so your existing RLS policy handles ownership automatically.
- Unlike LinkedIn, an email doesn't tell you the sender's company or job title, so those fields start blank — fill them in if you know them, or leave them and fix later from the dashboard's **Edit** button.
- Duplicate check is by email address instead of LinkedIn URL (since that's the reliable unique signal here).
- No automatic enrichment call, same reasoning as the Chrome extension — you already have their email in this case anyway, so there's nothing to enrich.

## Setup

1. **Add your Supabase anon key.**
   Open `public/outlook/taskpane.html`, find `SUPABASE_ANON_KEY: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE"`, and replace it with your real key (same one used in the Chrome extension and `.env.local`).

2. **Deploy.**
   Commit and push these files to your repo — Vercel will deploy them automatically as part of your existing app. Confirm they're live by visiting:
   - `https://hirely-ten-rho.vercel.app/outlook/manifest.xml` (should show XML)
   - `https://hirely-ten-rho.vercel.app/outlook/taskpane.html` (should show a blank Hirely-branded page — it needs to run inside Outlook to do anything useful)

3. **Sideload the add-in for testing.**

   **Outlook on the web:**
   - Open Outlook at outlook.office.com
   - Click the gear icon → **View all Outlook settings** → **Mail** → **Customize actions** → **Add-ins** (or: click the "..." on an open email → **Get Add-ins** → **My add-ins** → **Add a custom add-in** → **Add from file**)
   - Upload `manifest.xml`

   **Outlook desktop (Windows/Mac):**
   - Open any email → **Get Add-ins** (in the ribbon) → **My add-ins** → **Add a custom add-in** → **Add from file**
   - Upload `manifest.xml`

4. **Test it.**
   - Open any email in Outlook
   - Look for the **Hirely** group in the ribbon with a **Save to Hirely** button
   - Click it → task pane opens on the right → log in with your Hirely account (first time only) → review the sender's name/email → add company/title if you know them → **Save to Hirely**
   - Check your dashboard — the contact should appear under "Coming up"

## Notes

- **First load can be slow** — Office.js and the task pane both need to load fresh the first time you open it in a session.
- **Company/job title always start blank** — there's no reliable way to infer these from an email alone. This is expected, not a bug; the Edit button on the dashboard is the fix.
- **Publishing to AppSource** (Microsoft's add-in store) is a separate, more involved process than Chrome Web Store submission — needs a Partner Center account and a validation/review process. Not required for personal use; sideloading is enough for you and anyone else at Western Jobs to use it, as long as they sideload the same manifest.
