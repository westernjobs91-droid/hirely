# Hirely Outlook Add-in

Adds a "Save to Hirely" button to the ribbon when reading an email. Click it, and a task pane opens showing the sender's name and email (pulled straight from the message), ready to save into your Hirely pipeline.

## How it works

- These files are hosted as static pages inside your existing Next.js app (`public/outlook/`), so once deployed they're live at:
  - `https://app.hirelypro.com/outlook/manifest.xml`
  - `https://app.hirelypro.com/outlook/taskpane.html`
- `manifest.xml` is the file Outlook reads to know the add-in exists — it points at `taskpane.html` and tells Outlook to show a button in the ribbon when reading a message.
- `taskpane.html` is a self-contained page (like the Chrome extension's panel) that uses Microsoft's Office.js API to read the currently-open email's sender or first recipient name and email address, then lets you review/edit and save through Hirely's authenticated API.
- The add-in does not scan the mailbox or save the message body.
- Unlike LinkedIn, an email doesn't tell you the sender's company or job title, so those fields start blank — fill them in if you know them, or leave them and fix later from the dashboard's **Edit** button.
- Duplicate check is by email address instead of LinkedIn URL (since that's the reliable unique signal here).
- No automatic enrichment call, same reasoning as the Chrome extension — you already have their email in this case anyway, so there's nothing to enrich.

## Setup

1. **Deploy.**
   Commit and push these files to your repo — Vercel will deploy them automatically as part of your existing app. Confirm they're live by visiting:
   - `https://app.hirelypro.com/outlook/manifest.xml` (should show XML)
   - `https://app.hirelypro.com/outlook/taskpane.html` (should show a blank Hirely-branded page — it needs to run inside Outlook to do anything useful)

2. **Sideload the add-in for testing.**

   **Outlook on the web:**
   - Open Outlook at outlook.office.com
   - Click the gear icon → **View all Outlook settings** → **Mail** → **Customize actions** → **Add-ins** (or: click the "..." on an open email → **Get Add-ins** → **My add-ins** → **Add a custom add-in** → **Add from file**)
   - Download `manifest.xml`, choose **Add from file**, and upload it. Microsoft no longer offers **Add from URL** for Outlook add-in sideloading.

   **Outlook desktop (Windows/Mac):**
   - Open any email → **Get Add-ins** (in the ribbon) → **My add-ins** → **Add a custom add-in** → **Add from file**
   - Download `manifest.xml`, choose **Add from file**, and upload it.

3. **Test it.**
   - Open any email in Outlook
   - Look for the **Hirely** group in the ribbon with a **Save to Hirely** button
   - Click it → task pane opens on the right → log in with your Hirely account (first time only) → review the sender's name/email → add company/title if you know them → **Save to Hirely**
   - Check your dashboard — the contact should appear under "Coming up"

## Notes

- **First load can be slow** — Office.js and the task pane both need to load fresh the first time you open it in a session.
- **Company/job title always start blank** — there's no reliable way to infer these from an email alone. This is expected, not a bug; the Edit button on the dashboard is the fix.
- **Publishing to AppSource** is the production distribution path. It lets organizations install from Microsoft Marketplace or deploy Hirely centrally without allowing users to sideload custom add-ins. Until approval, the manifest remains available for testing and administrator deployment.
