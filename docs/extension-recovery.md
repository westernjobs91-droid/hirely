# LinkedIn capture incident plan

Version 1.3.2 adds a bounded semantic fallback, exception handling, retry and manual capture. Unsupported layouts must return empty uncertain fields, not guessed data. Automatic fields are cleared on extraction failure; manually edited fields survive retries. A valid first name is required to save.

## If capture breaks in production
1. Ask for the extension version, whether refresh/retry helps, and a screenshot of the profile introduction and Hirely panel. Do not request cookies, tokens or a whole browsing history.
2. Users can expand Edit profile details, enter the fields they can verify, and save with the current profile URL. Keep title/company blank when uncertain.
3. Reproduce the layout and add a minimal anonymized DOM fixture that fails before the fix. Run `node --test tests/extension-layout.test.cjs tests/extension-photo.test.cjs tests/extension-background.test.cjs` after installing project dependencies.
4. Verify live against the affected profile, a grouped promotion, and navigation between profiles; check name, title, company and photo. Do not save test contacts to production.
5. Increment the manifest patch version, package with `npm run package:extension`, and distribute through the existing extension release channel. Chrome Web Store deployments need submission/review and client update time; unpacked installs need Reload plus a LinkedIn refresh.
6. If the extension release itself caused the regression, publish the previous known-good code under a NEW higher version. A rollback alone cannot fix a LinkedIn layout change.

## Monitoring gap
Automatic aggregate failure-rate reporting, alerting and a remotely controlled manual-only mode are NOT implemented. Before broad production rollout, add an authenticated, rate-limited endpoint for version/status counters (no profile names, URLs, emails or DOM), an owner/alert destination, and an alert based on sustained failure rate with a minimum sample size. Do not claim incidents will be detected automatically until this exists. Never download executable scraper patches from a remote endpoint; use packaged extension updates.
