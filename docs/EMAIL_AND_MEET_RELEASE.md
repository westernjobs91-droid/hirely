# Hirely email finder and Meet workspace
## Included
- Shared authenticated resolver for extension and dashboard.
- Free saved-data/company-pattern predictions; optional Hunter finder/verifier requests.
- Prediction, unverified, catch-all, invalid and verified mailbox states saved with evidence.
- No Hunter requests when opening LinkedIn profiles or adding contacts.
- Existing company admin supports an evidence URL. Company cache misses no longer automatically purchase PDL enrichment.
- Meet workspace: contact-linked notes, saved history, explicit AI summaries and copy.
- Email drafts open the mail app; the CRM does not falsely report that a message was sent.

## Deployment order
1. Review and run supabase/migrations/20260914_email_and_meet.sql against the intended Supabase project. Back up first under the project's usual deployment process.
2. Configure hirely_limits per customer: email_limit and meet_limit. Defaults are 10 requests per UTC calendar month. Stripe plan synchronization with these new limits is not included yet; existing paid accounts must be seeded before rollout.
3. Review existing company_cache RLS: only your administrator should be able to write curated company patterns. Existing contacts RLS must enforce user_id = auth.uid(). New tables include owner policies in the migration.
4. Deploy application with existing Supabase environment variables and server-only SUPABASE_SERVICE_ROLE_KEY. HUNTER_API_KEY is optional for free prediction; ANTHROPIC_API_KEY enables Meet summaries. Optional HIRELY_MEET_MODEL overrides the existing model.
5. Reload the unpacked extension. Existing uncommitted extraction improvements are preserved.
6. Test with a staging account: save a LinkedIn profile, predict a seeded pattern, verify explicitly, save/reopen meeting notes, then request one summary.

Paid request reservations are conservative: failed or empty provider calls still count. The app does not claim they equal the provider's invoice credits. Company metadata and individual email caches have separate ownership rules.
Legacy meeting_summaries rows remain untouched; the new workspace uses hirely_meetings. An import is needed to show old meeting summaries there.

## Next phase: live recording and transcription
Start with user-initiated microphone recording in Hirely Meet, with visible recording state and participant consent, followed by transcription and the existing review/save flow. Browser microphone capture alone does not capture both sides of every video call. Full Zoom/Teams/Google Meet capture needs an explicit choice between a meeting bot/provider and desktop/tab audio capture.
Before implementation, select the transcription provider and storage/retention policy, then add signed private uploads, per-user access checks, request limits, recording recovery and deletion. Never automatically join calls or start recording.
No live recording, meeting bot, transcription provider, calendar synchronization or automatic sending is included in this workspace release.

## Validation
Run node --test tests/email-resolver.test.cjs, TypeScript checking, and a production build.
Database migration and live provider calls require staging validation; unit tests use provider/database doubles and consume no credits.
