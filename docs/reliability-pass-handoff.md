# Hirely reliability pass — 2026-09-19

## Completed locally
- Verified Company Data API already authenticates via getUser and checks a server-side admin allowlist before obtaining its service-role client. Sidebar visibility is not its authorization boundary.
- Hardened app/api/leads/route.ts: all handlers verify the user with getUser; PATCH allows only ordinary contact text fields, rejects owner/system/verification changes, and resets verification on manual email changes. Malformed JSON and invalid IDs are rejected. Owner filters remain on reads, updates and deletes.
- Added tests/leads-route.test.cjs: 13 passing tests. TypeScript no-emit and git diff --check passed.
- Changes are local, not deployed. Dashboard currently writes contacts directly via Supabase, so API hardening is not a replacement for RLS.

## Unresolved higher-risk work (Astra)
Update: the data-protection implementation and production read-only audit are now in `docs/DATA_PROTECTION_RELEASE.md`. The items below record the earlier findings; production migration/deployment and authenticated post-release smoke tests remain pending.
- Verify deployed contacts and legacy company_cache RLS. Existing release documentation also flags this; repository migrations do not establish their current production policies. Do not claim a confirmed data exposure without evidence.
- Legacy /admin/seed still uses browser-side admin checks and direct company_cache writes. Review actual RLS and retirement/migration strategy; do not remove existing data.
- Deletion is still immediate hard deletion after confirmation. Plan persistent Trash/restore across API, direct dashboard queries, extension lookups and related data before implementing. A custom modal alone does not solve recovery.
- CSV import needs explicit mapping, validation, duplicate policy and batch error reporting before implementing writes.

## Next bounded batch (Sol)
1. Implement Cmd/Ctrl+K to focus sidebar search, with event-listener cleanup.
2. Wire LinkedIn/Outlook import choices to the existing Integrations view; clearly label CSV/Excel and API/Zapier unavailable until implemented. Remove the unsupported promise that all imports auto-enrich through Hunter/Apollo.
3. Correct the Settings label/routing so it does not imply account settings that do not exist.
4. Add keyboard focus visibility to controls touched by these changes.
Use current code; preserve existing edits by the user/Claude and the extension fixes. Do not expand this batch into import/database functionality. Type-check and verify keyboard/navigation behavior, preferably in an authenticated local dashboard. Do not deploy or claim live verification without doing it.

## Existing work to preserve
components/IntegrationsView.tsx and public/downloads were already modified before this pass. Extension version 1.3.2, package files, docs/DASHBOARD_AUDIT.md, docs/extension-recovery.md and tests/extension-layout.test.cjs predate this pass. .claude is user tooling. Do not revert or overwrite these changes.
