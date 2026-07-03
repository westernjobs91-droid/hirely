# Hirely LinkedIn Chrome Extension

Adds a "Save to Hirely" tab on the right edge of every LinkedIn profile page (`linkedin.com/in/...`), like ContactOut/Wiza. Click it, review the scraped name/title/company, and save straight into your Supabase `contacts` table — no Hirely tab needed open.

## How it works (architecture)

- **content.js** runs on LinkedIn profile pages. It scrapes the name, headline, company, photo, and profile URL from the page DOM, and renders the slide-out panel (in a Shadow DOM so LinkedIn's CSS can't break it).
- **background.js** (service worker) does all the network calls — login, session refresh, and the actual Supabase insert. This is deliberate: content scripts inherit LinkedIn's CORS restrictions, but the background service worker (with `host_permissions` granted in the manifest) can call Supabase and your Vercel app directly without CORS issues.
- Auth is handled by hitting Supabase's own auth REST endpoint (`/auth/v1/token?grant_type=password`) with the same email/password the recruiter uses on the Hirely web app. The access token is stored in `chrome.storage.local` and refreshed automatically.
- Saving a contact **writes directly to Supabase** via PostgREST (`/rest/v1/contacts`) using the logged-in user's access token — so your existing RLS policy (`auth.uid() = user_id`) enforces ownership automatically. No new Next.js API route is required for the save itself.
- After a successful save, the extension calls your existing `POST /api/enrich` endpoint in the background (fire-and-forget) so Apollo/Hunter enrichment kicks in the same way it does from the web app. If that call fails for any reason, the contact is still saved — it just won't be auto-enriched until you open it in the dashboard.
- Before inserting, it checks for an existing contact with the same `linkedin_url` for that user, so re-clicking "Save" on a profile you already captured won't create a duplicate — it shows "Already in Hirely" instead.
- **Enrichment is deliberately not triggered from the extension.** Apollo/Hunter credits are limited, and firing a lookup on every single save — before you've had a chance to fix a mis-scraped company name — wastes them on contacts you might not pursue. Use the **"Find email"** button on the contact's card in the Hirely dashboard once you're ready to reach out.

## Setup

1. **Add your Supabase anon key.**
   Open `config.js` and replace `PASTE_YOUR_SUPABASE_ANON_KEY_HERE` with your real anon key (same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` / Vercel). This key is public by design — it's the same one already shipped in your web app's client bundle.

2. **Load the extension in Chrome.**
   - Go to `chrome://extensions`
   - Turn on **Developer mode** (top right)
   - Click **Load unpacked**
   - Select this `hirely-extension` folder

3. **Test it.**
   - Click the Hirely icon in your toolbar → log in with your Hirely account (same email/password as the web app)
   - Go to any LinkedIn profile, e.g. `linkedin.com/in/someone`
   - Click the blue **Save to Hirely** tab on the right edge
   - Review the scraped fields (edit if LinkedIn's layout scraped something oddly), click **Save to Hirely**
   - Check your dashboard at hirely-ten-rho.vercel.app — the contact should appear, and enrichment should kick in shortly after

## Notes / things to verify on your end

- **Column defaults:** new contacts are saved with `column_name: "coming_up"` and `status_label: "New"`. If your dashboard's kanban columns use different key names, update those two values in `background.js` → `saveContact()` to match.
- **Scraping selectors:** LinkedIn changes its DOM fairly often and the class names are obfuscated. The scraper tries a few fallback strategies for name/title/company, but if a field comes back empty on some profiles, the recruiter can just type it in manually before saving — the panel fields are always editable.
- **`/api/enrich`:** the extension calls this with `{ contactId, firstName, lastName, company }` and an `Authorization: Bearer <token>` header. If your route expects a different shape or reads the user from a cookie-based session rather than a Bearer token, you'll want to add Bearer-token support there (or just have it look up the contact by `contactId` and enrich regardless of who's calling — since RLS already guaranteed the contact belongs to that user at insert time).

## Next steps

- Once this is tested and working, submit to the Chrome Web Store (needs a developer account, $5 one-time fee, and a short review — usually a few days).
- For the Chrome Web Store listing you'll want: a short description, 1-2 screenshots of the panel in action on a LinkedIn profile, and your existing icon128.png (already in `icons/`).
- Icons in `icons/` were generated to match your brand mark (blue #2563EB, white "H" with arrow crossbar) — swap them for your real exported logo assets any time.
