# Plan foundation — September 20, 2026

Implemented locally; not deployed. Production remains on commit 449d150 with the previous pricing. Do not push main until the coordinated billing cutover below is ready: main automatically deploys to Vercel.

## Agreed launch scope

| Plan | Monthly USD | Active contacts | Email/month | Meet requests/month | Draft generations/month |
|---|---:|---:|---:|---:|---:|
| Free | 0 | 50 | 5 | 0 | 0 |
| Solo | 29 | 1,000 | 50 | 25 | 50 |
| Pro | 59 | unlimited | 200 | 75 | 200 |

Draft limits use the proposed 50/200 default; one generation produces three drafts. No recurring Free Meet allowance, one-time demonstration, paid trial, or Founder discount has been configured. Agency stays unavailable for checkout until shared workspaces, membership and permissions are implemented. Proposed Agency pricing and allocations are not active entitlements.

Email misses/provider errors remain uncharged. Meet and draft credits currently count requests started, including provider failures; the pricing page says so. Audio remains Coming soon. Calendar-month usage resets at UTC month boundaries, not on subscription renewal. Upgrades/downgrades retain usage; they do not reset credits. Existing contacts survive downgrades, remain readable/editable, and can be moved to Trash. New contacts and restores are blocked above the active-contact cap.

## Implemented and tested

- Protected billing accounts, owner overrides, a self-only entitlement RPC, database contact capacity enforcement and atomic email/Meet/draft quotas. Editable profiles and legacy hirely_limits are no longer entitlement authorities.
- Authenticated account endpoint. Sidebar and Meet usage use the new authority. Error messages expose contact-limit failures without false success.
- Stripe configured-price validation for new USD monthly $29/$59 checkouts; no fallback to old checkout prices. Existing recognized $19/$39 subscriptions retain their prices and map to Solo/Pro features. Agency/unknown prices require review rather than silently becoming Solo.
- One bounded per-account lease serializes subscription reads and updates. Webhooks re-read current Stripe subscriptions rather than applying historical event payloads, so replayed/out-of-order notifications converge. Unpersisted writes return 503 for retries. An expired worker cannot commit billing changes. Manual grants cannot be overwritten by Stripe events.
- Existing subscriptions route to billing portal. Open checkouts are reused. Complimentary accounts cannot purchase another subscription. Portal/customer ownership comes from the protected account, never a mutable profile field.
- Paid Outlook capture endpoint, explicit owner and safe-field filtering, duplicate/Trash checks. Current Outlook taskpane uses this endpoint. Older add-ins can still use ordinary direct contact insert APIs, like manual CRM entry; contact capacity remains enforced there. Client branding is not an authorization boundary.
- Pricing shows only shipped capabilities. Advanced analytics, priority queues, CSV import/export and Agency collaboration are not advertised as completed.

## Required before production cutover

1. Inventory existing Stripe subscriptions in read-only mode, including any legacy Agency customers. Resolve legacy Agency entitlements before changing enforcement; no automatic mapping is provided. Create new Stripe USD monthly prices at $29 and $59; leave existing subscription prices untouched. Configure STRIPE_SOLO_MONTHLY_PRICE_ID and STRIPE_PRO_MONTHLY_PRICE_ID. Configure the customer portal to offer only intended Solo/Pro prices.
2. Stage and test against a separate Supabase/Stripe test environment. Test checkout completion, renewal, failed payment, cancellation, concurrent checkout, upgrade/downgrade, and webhook retry. Unit tests mock Stripe; no real Stripe test checkout has been performed in this pass.
3. Apply supabase/migrations/202609200001_plan_entitlements.sql during a coordinated cutover. It replaces the credit reservation function, so until accounts are reconciled existing paid users would resolve to Free. Freeze checkout while seeding/reconciling accounts and deploying the matching webhook. Do not deploy old webhook code against the new entitlement authority.
4. Backfill protected accounts from Stripe-verified customer/subscription ownership. Verify Stripe customer metadata supabase_user_id against auth.users, not just editable profile values. For each account, retrieve current subscription state under hirely_claim_billing_lock and commit using hirely_sync_billing. Replay notifications for the cutover interval. The old profile plan/status columns may remain as historical display data; new code ignores them for access.
5. Preserve the explicitly authorized owner grant BEFORE switching enforcement: resolve growwithjey@gmail.com to its exact auth.users.id, create hirely_billing_accounts with plan='pro', status='active', source='manual', and create hirely_plan_overrides with email_limit=500 and reason='Authorized owner allowance'. Do not reset hirely_usage: the reported credit has already been restored in production. Meet and draft limits then follow Pro (75/200).
6. Deploy the matched application/Outlook changes, refresh clients, and verify the owner's limits, Free restrictions, contact cap/restore, and an isolated paid test user's checkout. The migration never removes contacts, notes or usage. Roll forward on errors; do not drop billing/usage rows as rollback.

The repository also has a pre-existing duplicate migration prefix (20260914). Supabase Preview fails on that history; reconcile migration history separately rather than renaming applied migrations blindly. The new migration uses a unique longer prefix.

## Next Sol batch

Use the tested entitlement RPC and /api/account; do not introduce client-only billing enforcement or read plan authority from profiles. Improve pricing layout, current-plan badges, usage meters, upgrade dialogs, disabled paid actions and accessible error/loading states. Add usage to AI drafts, and refresh it after requests. Clearly label monthly UTC resets and request charging for Meet/drafts. Keep Agency, audio and CSV unavailable until their functionality exists.

CSV import/export and Agency work require a separate implementation pass with tests: mapping/validation, duplicates and batch errors for CSV; membership, roles, cross-account isolation and seat enforcement for Agency. Do not claim those are completed by this foundation. Advanced analytics and priority enrichment also remain subsequent work.
