# Hirely testing report — September 13, 2026

## Result
Local validation passes after one meeting fix. The release is not ready for a real-account end-to-end test because the configured Supabase REST API reports the four new tables as unavailable. No migration, deployment, customer-data write, email send, or paid provider call was performed during testing.

## Completed
- 20 automated tests passed: 9 email resolver tests and 11 Meet route tests. Database, authentication, and provider dependencies were replaced with test doubles. These tests do not prove live database RLS enforcement.
- TypeScript checking and production build passed on the staged code. Extension content and background scripts passed syntax checks.
- Chrome checks passed on the production preview with fake authentication, contacts, database responses, and API responses: linked meeting notes save; summary display; create another meeting and reopen the saved meeting with notes and linked contact intact; free email prediction; paid verification opt-in; catch-all display. No browser page errors.
- Existing project changes were preserved.

## Bug found and fixed
Requesting a cached summary returned before saving an edited meeting title or linked CRM contact. The route now saves the edits, preserves the completed summary state, and returns the cached summary without another AI request. A regression test covers this case.

## Live readiness check
A read-only request using the locally configured public Supabase key and `limit=0` returned HTTP 404 / PGRST205 for each table:
- hirely_meetings
- hirely_limits
- hirely_usage
- email_resolutions

This establishes that the tables are unavailable through the configured API; it does not independently prove whether they are absent from PostgreSQL or hidden from its schema cache.

The local environment has the public Supabase URL/key, Hunter key, and Anthropic key configured. SUPABASE_SERVICE_ROLE_KEY is missing locally. Key presence does not establish validity or production configuration; no keys were exposed in the test output.

## Remaining validation
1. Apply the included migration to the intended staging database and confirm API schema visibility.
2. Configure the server-only Supabase service key and account limits.
3. Test authenticated create/reload with a staging account and verify cross-account access is denied by real RLS policies.
4. Test extension capture on an actual LinkedIn profile and reload the saved contact in the CRM.
5. Run an explicit provider lookup/verification and meeting summary with staging data to validate credentials and usage accounting.
6. Deploy only after those checks pass. Live recording/transcription is not part of this release.

## Reproduce local unit checks
Run `node --test tests/*.test.cjs` from the Hirely folder, then TypeScript checking and the production build. Browser test fixtures and screenshots are retained in the isolated hirely-work testing folder.
