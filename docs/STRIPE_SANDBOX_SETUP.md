# Hirely Stripe sandbox — September 21, 2026

Production is not changed. Foundation commit 986fff5 remains local pending the coordinated release in PLAN_FOUNDATION_HANDOFF.md.

Sandbox account: `acct_1UHoLHGVdejInC9A` (Hirely sandbox, under Hirely).

| Plan | Product | Monthly USD price | Price ID |
| --- | --- | --- | --- |
| Solo | prod_VIZPdRxlTEk2h7 | 29 | price_1UHyGlGVdejInC9AUe6PsKK0 |
| Pro | prod_VIZQArDDxXBioQ | 59 | price_1UHyHCGVdejInC9AoEY4ZzCM |

Both are recurring monthly, active, with tax excluded from the base price. The business SaaS category with an included downloadable app/plugin is txcd_10103101, matching the extension supplied with Hirely. Do not put these sandbox IDs in production configuration.

Managed Payments settings show Ready to use and enabled by default. The application now explicitly sets managed_payments.enabled and omits the unsupported payment_method_types setting. Only an existing Managed Payments checkout for the selected price is reused; older unmanaged sessions are expired first.

Stripe sandbox API key and an isolated Supabase test database are still required for end-to-end application checkout/webhook testing. No sandbox transaction or full subscription lifecycle has been verified yet. The local .env.local points at production, so do not run sandbox billing against it.

Store the sandbox secret locally in ignored .env.stripe-test.local, never in this document or git. Use a separate test database URL, anonymous key and service role key in that file before running the app in sandbox mode. Live activation may require account verification and acceptance of Stripe terms by the owner.

Validation: all 15 billing tests pass, including explicit Managed Payments enablement and replacement of unmanaged open sessions. TypeScript and git diff checks pass. These checks do not replace actual sandbox checkout and webhook testing.

References: https://docs.stripe.com/payments/managed-payments/update-checkout and https://docs.stripe.com/payments/managed-payments/eligibility.
