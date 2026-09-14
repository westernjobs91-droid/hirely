# Hirely Meet audio upload

Apply `supabase/migrations/20260915_meet_audio.sql` in Supabase SQL Editor after the existing Meet migration. Set `OPENAI_API_KEY` on the deployment server and redeploy. The existing `ANTHROPIC_API_KEY` continues to power summaries. Never put these secrets in NEXT_PUBLIC variables or the extension.

The recording uploads directly to a private Supabase bucket (24 MB maximum), bypassing app request body limits. Only the owner can upload, read or delete a recording. The backend reads the owned upload and sends it as multipart audio to OpenAI Whisper (`whisper-1`). The 24 MB limit leaves headroom below the provider request limit. The transcript is appended to existing notes and saved. The user reviews it before requesting a summary with key points, organized notes, decisions and actions.

Transcription consumes one Meet credit per provider attempt. Summarization separately consumes one Meet credit under the existing policy. No real provider requests are made by automated tests. Configure the host to permit a 120-second route; transcription times out after 90 seconds without automatic retries. Longer recordings may need splitting. Notes over 40,000 characters remain visible for copying/editing rather than being silently truncated.

The client attempts to delete the uploaded recording after processing, including on errors. A closed tab or interrupted network can leave an orphaned private upload. Periodically remove old objects from this bucket via the Storage API; do not delete storage.objects rows directly. No call recording or meeting bot is included.

Provider references:
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl
