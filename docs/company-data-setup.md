# Company Data pilot

## Enable

1. Apply `supabase/migrations/20260916_company_data.sql` in Supabase SQL Editor.
2. Ensure the deployment server has `SUPABASE_SERVICE_ROLE_KEY` (never NEXT_PUBLIC). Existing Supabase public URL and anon key remain required.
3. Optionally set `HIRELY_ADMIN_EMAILS` to a comma-separated admin list. The existing owner account `growwithjey@gmail.com` is the default. Other allowed admins can open `/admin/companies` directly; the sidebar shortcut is shown to the owner account.
4. Deploy, sign in and open Company Data. Click **Import my CRM companies**. This copies company names from the administrator's own CRM only, with zero search demand. It does not copy employee names, email addresses or other customers' CRM data. Re-importing preserves counters. Each run scans at most 10,000 contacts.

## First 100 companies

Start with the request queue (top 100 by actual search demand). Confirm each company's official website/domain, country and industry. Prioritize confirmed Canadian food processing, manufacturing, logistics and warehousing employers. The queue does not guess country from `.ca` or assume CRM contacts are Canadian.

Save the company. Add two distinct named employee email examples from official company pages or licensed data with reuse rights. Record the actual observation date and source URL. Check the reuse attestation only after confirming it. Provider results and private customer contacts are never automatically promoted into shared evidence.

Select a candidate pattern and approve. The server rejects unsupported patterns, conflicting qualifying evidence, wrong domains, stale/future evidence and duplicate-person examples. Excluding evidence is an explicit admin action. Domain edits, evidence edits and exclusions invalidate approval. Pause a pattern to stop new predictions. Approval expires no later than the earliest qualifying evidence's 90-day expiry; evidence is checked again at lookup time.

The earlier `/admin/seed` company_cache entries no longer drive new predictions. Re-enter their domain and evidence in Company Data before approving them. Old customer-specific email results remain subject to the existing cache policy.

## Tracking and data boundaries

Searches record company name/domain and aggregate counts, not searched employee names or emails. Confirmed-domain aliases are combined in the request queue when saved; subsequent requests use the confirmed domain. Unknown company names remain separate until reviewed. Shared tables and reporting functions are service-role only, with RLS enabled and no browser access grants.

Calls avoided means a successful result returned without a provider request (both owner-specific cached email and approved pattern results). It is not a count of independently verified addresses or a monetary estimate. Requests include valid consented find attempts; verification calls are outside this report. Aggregate metrics are best effort and do not block email delivery if reporting fails. No provider spending or automatic web crawling is triggered by queue import.

## Limits of this release

This creates the pilot workflow, not a populated 100- or 10,000-domain dataset. Evidence collection and source-rights review remain manual. There is no automatic licensed-feed purchase, background crawler, measured accuracy score or collection of other customers' private emails. Existing provider cache reuse rights must be reviewed before expanding reuse across accounts. UI and route behavior are tested with doubles; the migration must be applied and a live admin smoke test completed after deployment.
