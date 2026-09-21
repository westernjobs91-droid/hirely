# Hirely Stripe sandbox — September 21, 2026

Production is not changed. Foundation commit 986fff5 remains local pending the coordinated release in PLAN_FOUNDATION_HANDOFF.md.

Sandbox account: `acct_1UHoLHGVdejInC9A` (Hirely sandbox, under Hirely).

| Plan | Product | Monthly USD price | Price ID |
| --- | --- | --- | --- |
| Solo | prod_VIZPdRxlTEk2h7 | 29 | price_1UHyGlGVdejInC9AUe6PsKK0 |
| Pro | prod_VIZQArDDxXBioQ | 59 | price_1UHyHCGVdejInC9AoEY4ZzCM |

Both are recurring monthly, active, with tax excluded from the base price. The business SaaS category with an included downloadable app/plugin is txcd_10103101, matching the extension supplied with Hirely. Do not put these sandbox IDs in production configuration.

Managed Payments settings show Ready to use and enabled by default. The application now explicitly sets managed_payments.enabled and omits the unsupported payment_method_types setting. Only an existing Managed Payments checkout for the selected price is reused; older unmanaged sessions are expired first.

The sandbox key has been verified against the account above. An isolated local Supabase project was created at `/private/tmp/hirely-billing-sandbox.9Kl749`. The local .env.local points at production, so do not run sandbox billing against its database settings. The integration harness reads only its Stripe test key and obtains database settings exclusively from the isolated local project.

## Verified September 21

Two sandbox customers were created with fictitious example.com addresses and Stripe test cards. No live customer, payment, plan or credit was changed.

- Real local Supabase authentication and the unmodified plan migration; Free entitlements and blocked Free Meet requests.
- Actual checkout handler created the correct customer, ignored a supplied attacker user ID, reused the existing session, and enabled Managed Payments.
- Hosted Checkout displayed Solo USD 29 plus Ontario HST USD 3.77. Stripe's generic-decline test card was rejected, and the local account remained Free.
- Successful test purchase activated Solo with 50 email / 25 Meet / 50 draft limits.
- Upgrade to Pro, downgrade to Solo, cancellation to Free and successful monthly renewal (using a Stripe test clock) updated the protected billing account correctly.
- Actual Stripe events were retrieved, signed with a locally generated test webhook secret, and processed through the real webhook route. Replaying earlier events did not restore obsolete plans. This verifies handler integration, NOT network delivery from Stripe to a deployed webhook endpoint.
- Both test subscriptions were canceled after testing. The local return page was blocked by Chrome with ERR_BLOCKED_BY_CLIENT; payment completion was confirmed through Stripe and the actual application handlers.

## Managed Payments finding and remaining checks

Direct default_payment_method updates are rejected on Managed Payments subscriptions. The standard customer portal changed the customer's default card but left the subscription's original card in use. Hirely now routes Managed Payments subscription management to https://app.link.com/; legacy subscriptions retain the standard Stripe portal. The pricing page explains that customers should sign into Link with their checkout email.

Failed renewal on a Managed Payments subscription remains unverified: Stripe's API restriction prevented replacing its card with the decline-on-renewal test card. Sandbox orders are not displayed in the Link app according to Stripe's documentation. Do not describe failed renewal or Link order management as end-to-end tested. Deployed webhook delivery/retry, live account activation/configuration, existing subscription inventory, migration and protected account backfill remain release prerequisites.

Store the sandbox secret locally in ignored .env.stripe-test.local, never in this document or git. Use a separate test database URL, anonymous key and service role key in that file before running the app in sandbox mode. Live activation may require account verification and acceptance of Stripe terms by the owner.

Validation after the management-flow correction: the full 149-test suite and production build passed. One additional failed-status regression was then added; all 19 billing tests pass (150 tests now exist in total). The failed-status regression uses mocked Stripe statuses and is not a completed Managed Payments failed-renewal test. Restart the local Supabase project before running `node scripts/test-stripe-sandbox.cjs /private/tmp/hirely-billing-sandbox.9Kl749`; append `--clock` for renewal testing. It uses a minimal existing-table fixture followed by the actual plan migration, not a copy of production data. Credentials are held in memory, and no secret is printed.

References: https://docs.stripe.com/payments/managed-payments/update-checkout and https://docs.stripe.com/payments/managed-payments/eligibility.
# September 21 deployment preparation

The owner requested deploying the website with sandbox payments, deferring real payments. Billing now requires `STRIPE_MODE=sandbox` with a test secret key (or an explicit `live` mode with a live key); signed webhook events from the other mode are rejected. The local integration harness selects sandbox explicitly.

Production inventory: 1 complimentary Pro profile and 13 Free profiles; no profile has a Stripe subscription ID. Vercel authentication was renewed and sandbox secret, mode, prices, app URL, and webhook secret configured. Sandbox webhook: `we_1UHyzAGVdejInC9As2Jjzif4`, targeting `/api/stripe/webhook`. The plan migration and owner grant were applied together; verified Pro/manual, email limit 500 with 9 used, Meet 75 with 2 used, draft 200 with 0 used, unlimited contacts. Usage was not reset.

Sandbox checkout and reconciliation default to an empty account allowlist. Set `STRIPE_SANDBOX_USER_IDS` to comma-separated verified auth user UUIDs for designated testers. No testers are enabled yet. `STRIPE_SANDBOX_ALLOW_ALL=true` is an explicit opt-in for a public test launch; do not enable it without the owner's approval because test subscriptions grant real feature quotas. The complimentary owner cannot purchase a duplicate subscription. Pricing displays a test-mode notice via `NEXT_PUBLIC_STRIPE_MODE=sandbox`.

Before live payments: disable sandbox checkout, cancel test subscriptions, reconcile/remove sandbox customer references and paid test entitlements (preserve manual grants and usage), then configure live account keys, live prices, live webhook and both mode variables together. Do not simply swap keys while sandbox paid rows remain active. The historical test limitations below remain applicable until separately verified.
