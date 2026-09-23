# Email discovery cost control

Hirely resolves a user-requested work email in this order:

1. The contact's saved address.
2. The user's fresh resolution cache.
3. A reviewed shared company pattern.
4. Hunter Email Finder or Verifier.

Opening LinkedIn and saving a contact never call Hunter. Only an explicit **Find email** or verification action can reach the provider.

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

When Hunter returns a named address with a source URL on the same company domain, Hirely:

- identifies the observed naming pattern;
- adds the company or updates its aliases;
- stores the example in Company Data as **Awaiting reuse review**;
- never automatically approves the company pattern.

An administrator must open `/admin/companies`, confirm the official domain and evidence reuse, and approve only after two distinct recent examples agree. Approved patterns remain predictions rather than mailbox verification.

## Deployment checklist

1. Back up the intended Supabase project.
2. Apply the provider-budget migration.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in the deployment environment.
4. Set `HUNTER_MONTHLY_CREDIT_LIMIT` to the actual plan allowance.
5. Set `HUNTER_BILLING_CYCLE_DAY` to the renewal day shown by Hunter.
6. Seed already-consumed credits for the current billing period when deploying mid-cycle.
7. Deploy the Next.js application.
8. Reload the unpacked extension only if extension files changed; this release does not require an extension-package change.
9. Test a cache hit, a Hunter success, a Hunter miss, and budget exhaustion in staging.
