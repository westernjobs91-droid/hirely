# Email discovery cost control

Hirely resolves a user-requested work email in this order:

1. The contact's saved address.
2. The user's fresh resolution cache.
3. A reviewed shared company pattern.
4. One targeted Exa search for a directly published employee email.
5. Hunter Email Finder, or Hunter Verifier for mailbox verification.

Opening LinkedIn and saving a contact never call Exa or Hunter. Only an explicit **Find email** action can search Exa and then fall back to Hunter. Verification remains Hunter-only.

## Exa fallback and pattern collection

Set these server-only variables after creating an Exa API key:

```text
EXA_API_KEY=...
EXA_MONTHLY_REQUEST_LIMIT=100
EXA_BILLING_CYCLE_DAY=1
```

The Exa limit defaults to zero, so no Exa request is possible until an explicit ceiling is configured. Each lookup makes at most one search with at most three results. Hirely accepts a result only when the employee's name and a supported address format appear together on an HTTPS page hosted by that email's company domain. Ambiguous results are discarded and fall through to Hunter.

Every accepted Exa result is cached and stored as reviewable company-pattern evidence. It is never auto-approved. Once two distinct employees provide recent, matching evidence and an administrator confirms the domain and reuse, future employees at that company can use the approved pattern without Exa or Hunter.

## Global provider ceiling

Run `supabase/migrations/202609230001_provider_budget.sql`, then set this server-only environment variable:

```text
HUNTER_MONTHLY_CREDIT_LIMIT=50
HUNTER_BILLING_CYCLE_DAY=2
```

The database atomically reserves from this global ceiling before a Hunter request. The cycle day must match the renewal day shown in Hunter billing. Empty results, provider errors, and timeouts release the reservation. A successful returned email keeps one reservation. This is separate from customer-facing Hirely plan credits.

If the Hunter account already used credits before this migration is installed, seed that usage once for the current billing period. For the cycle that began September 2, 2026, with 12 of 50 credits already used:

```sql
insert into public.provider_usage_monthly(provider,month,reserved_credits)
values('hunter',date '2026-09-02',12)
on conflict(provider,month) do update set reserved_credits=excluded.reserved_credits,updated_at=now();
```

Do not expose `HUNTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or the provider-limit variables in the Chrome extension.

## Growing the shared pattern database

When Hunter Finder returns a named address, Hirely:

- identifies the observed naming pattern;
- adds the company or updates its aliases;
- stores an official same-domain source as **Awaiting reuse review**;
- otherwise stores it as a **Provider candidate — not reusable yet**;
- never automatically approves the company pattern.

Provider candidates are useful leads, but they cannot be approved directly and never participate in pattern prediction. An administrator must confirm the official domain and either find official evidence or confirm provider reuse rights and re-add the address as licensed data. Approval still requires two distinct, recent matching examples. Approved patterns remain predictions rather than mailbox verification. The **Backfill Hunter candidates** action processes existing saved Hunter results without making provider calls.

## Owner-only Apollo research

Apollo is deliberately outside the customer **Find email** pipeline. It is an administrator research aid in **Company Data** only. Set these server-only variables to enable the button:

```text
APOLLO_API_KEY=...
APOLLO_MONTHLY_CREDIT_LIMIT=75
APOLLO_BILLING_CYCLE_DAY=1
```

The limit defaults to zero. Hirely requests only work-email enrichment and explicitly disables personal emails, phones, and waterfall enrichment. It accepts only a high-confidence match with a verified work address on both the saved company domain and Apollo's returned employer domain.

Accepted addresses are stored as **Provider candidate — not reusable yet**. They are visible only to the administrator, cannot supply customer searches, and cannot qualify a company pattern for approval. To make a format reusable, independently locate the address on the official company website or add properly licensed evidence after confirming reuse rights. Do not copy Apollo candidates into licensed evidence unless the Apollo agreement for the account expressly permits that reuse.

The internal Apollo ceiling reserves one unit before each request. A confirmed no-match releases it; a matched person keeps the reservation because Apollo may charge for returned demographic or email data even when Hirely rejects the result.

## Deployment checklist

1. Back up the intended Supabase project.
2. Apply the provider-budget migrations through `supabase/migrations/202609230004_apollo_owner_research.sql`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in the deployment environment.
4. Set `HUNTER_MONTHLY_CREDIT_LIMIT` to the actual plan allowance.
5. Set `HUNTER_BILLING_CYCLE_DAY` to the renewal day shown by Hunter.
6. Set `EXA_API_KEY`, a conservative `EXA_MONTHLY_REQUEST_LIMIT`, and Exa's billing-cycle day.
7. Seed already-consumed credits for either provider when deploying mid-cycle.
8. If enabling owner research, set the Apollo key, limit, and billing-cycle day; otherwise leave the limit unset or zero.
9. Deploy the Next.js application.
10. Reload the unpacked extension only if extension files changed; this release does not require an extension-package change.
11. Test a cache hit, an Exa success, Exa-to-Hunter fallback, a Hunter miss, all enabled provider ceilings, and that a normal customer cannot call the Apollo admin action.
