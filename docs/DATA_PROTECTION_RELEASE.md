# Data protection pass

## Verified in production (read-only Supabase SQL editor)

Project `rjxlnutucxxefgqtohnc`, inspection September 19–20, 2026:

- contacts: RLS enabled. `Users can manage own contacts` applies to all operations with both USING and WITH CHECK `(auth.uid() = user_id)`. No broad alternative contact policies were present.
- company_cache: RLS enabled. `No direct client access` has USING false. The old browser-only seed screen was not an authorization bypass under these observed policies.
- Both tables had broad grants to anon and authenticated; row access was constrained by RLS. The migration reduces grants as additional protection. No production exploitation or cross-account data access was attempted.
- No contact triggers or deleted_at column existed.
- Follow-ups reference contacts with ON DELETE CASCADE. Meetings reference contacts with ON DELETE SET NULL. Hard deletion therefore loses follow-ups and the meeting link.
- The contact primary key is bigint. There was no unique LinkedIn URL/email constraint in the inspected contact constraints.

Use `supabase/verify-contact-access.sql` to repeat the read-only inspection. No production customer rows were retrieved or changed during this audit.

## Local changes

- contacts.deleted_at implements persistent Trash. Contact IDs, notes, schedules, drafts, follow-up rows and meeting links remain stored. There is no automatic purge or app-level permanent-delete control.
- Dashboard/API active queries exclude Trash; Trash lists owned contacts, 50 per page, with Restore. Failed or stale mutations report an error and do not claim success.
- A restrictive ownership policy blocks cross-account access even if a future permissive policy is too broad. Browser roles cannot hard-delete or truncate contacts. A trigger rejects ownership transfers and updates to trashed records except a restore that changes only deleted_at (and an optional updated_at timestamp).
- The old seed page redirects to Company Data. Existing cache records remain; clients lose direct cache privileges. The existing service-role Company Data API still checks the authenticated administrator.
- Enrichment and new meeting linkage exclude trashed contacts. Existing meetings and their contact references are retained.
- LinkedIn extension 1.3.3 and Outlook detect contacts in Trash and direct the user to restore them. Failed duplicate lookups block new inserts. Old browser sessions cannot edit trashed rows after the migration; they may still display stale cached data until refreshed.

## Verification

`tests/contact-access.test.cjs` runs the migration twice in an isolated PostgreSQL runtime, testing anonymous and cross-account access, hostile broad policies, insert/update ownership, blocked hard deletion, blocked cache access, Trash/restore, and retained follow-ups/meeting links. Service-role cache reads remain available.

Additional route, component, LinkedIn and Outlook tests cover Trash failure states, restore on owned rows only, refreshed views, manual edits, stale writes and duplicate checks. Run `node --test tests/*.test.cjs` and `npm run build`.

## Release order (not applied during this pass)

1. Verify the target project and obtain a database backup through the normal operational process. Review the SQL file and the read-only preflight output.
2. Apply `supabase/migrations/20260919_contact_trash_and_access.sql` as the database owner. This is a transaction; it does not delete contacts or cache data. Confirm all statements committed.
3. Repeat the verification SQL. Confirm deleted_at, owner restrictions, no-hard-delete policy, reduced grants and the update guard.
4. Deploy the matching dashboard/API/Outlook build and distribute extension 1.3.3. The migration is required: do not deploy code referencing deleted_at first. Keep the migration and app rollout close together: old dashboard clients will have their old hard-delete action blocked during the transition.
5. Refresh dashboard tabs, reload unpacked extensions and refresh LinkedIn tabs. Web Store users receive the packaged update through the normal release channel.
6. On an explicitly designated test contact in the intended environment, check Contacts → Trash → refresh → Restore; verify notes, schedule, follow-ups and linked meetings. Check that a second account cannot view or restore it. Test extension and Outlook detection while it is in Trash, then after restoring. Do not use a real customer record for a destructive smoke test.

Production authenticated smoke tests remain pending until the schema and matching code are released. No deployment or production migration was performed in this pass.

## Recovery

Keep the new column, records and restrictive policies if an app release fails. Prefer a forward fix or temporarily disabling capture over deploying old queries that show Trash as active contacts. Do not drop deleted_at or purge records to roll back the UI. Database-admin actions and deleting an auth user remain outside app-level Trash protection.
