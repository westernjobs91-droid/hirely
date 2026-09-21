# Hirely Dashboard Audit: UI/UX, Gaps and Feature Suggestions

Scope: the Next.js dashboard (`app/`, `components/`, `lib/`). The `hirely-extension/` folder was **not** read for changes or modified.

Method: full read of every dashboard component, plus an in-browser check of the login page at desktop and 375px mobile width. The dashboard itself sits behind Supabase auth, and the `.env.local` points at a hosted Supabase project. No test account was created, so the dashboard findings come from code review rather than live interaction.

---

## 1. What the dashboard lacks

### 1.1 No mobile or tablet support
- [app/page.tsx:286](../app/page.tsx) is a fixed three-pane flex layout.
- [Sidebar](../components/Sidebar.tsx) is a hard `w-52 min-w-[208px]`. [ContactPanel](../components/ContactPanel.tsx) is `w-96 min-w-[384px]`. Neither has a breakpoint or collapse toggle.
- The sidebar and panel alone take more than 600px, so the layout is unusable below about 1024px.
- Login, signup and pricing are responsive (verified at 375px). The dashboard is the exception.

### 1.2 No routing per view
- `activeNav` is component state, not a URL.
- A refresh always returns to Dashboard. Back/forward does not work. No view can be linked or bookmarked.

### 1.3 Import modal does nothing
- [ImportModal.tsx](../components/ImportModal.tsx) renders four source buttons (LinkedIn, Outlook, CSV/Excel, API/Zapier) with **no `onClick` handlers**.
- Only the Close button works. This is the largest functional gap found.

### 1.4 `⌘K` badge is decorative
- [Sidebar.tsx:97](../components/Sidebar.tsx) shows a `⌘K` badge, but no keydown listener exists anywhere.

### 1.5 Fragmented search
- The sidebar search only filters Contacts and Follow-ups.
- Analytics, Email finder, Meet and AI Drafts each have their own unrelated search, or none.
- Typing in the global search silently jumps to Contacts ([Sidebar.tsx:91-93](../components/Sidebar.tsx)).

### 1.6 Delete has no undo and uses a native dialog
- [handleDelete](../app/page.tsx) uses `window.confirm()` followed by an immediate hard delete.
- The native dialog clashes with the custom modals used elsewhere. There is no soft delete or undo toast.

### 1.7 No pagination or virtualization
- [ContactListView](../components/ContactListView.tsx) renders every contact at once. It will lag at hundreds of contacts.

---

## 2. UI/UX quality notes

**Strengths**
- Cohesive blue/slate palette and consistent rounded card styling.
- Thoughtful empty states in Dashboard, ContactListView, AnalyticsView and AIDraftsView.
- The "Suggested actions" block on the dashboard ([app/page.tsx:503-567](../app/page.tsx)) surfaces what needs attention well.

**Issues**
- **Focus states:** most interactive elements (nav items, stat cards, table rows) have no visible `:focus-visible` ring.
- **Text size:** a lot of 9-10.5px text (badges, hints) is below comfortable reading size.
- **Kebab menus:** built on native `<details>` with no click-outside handler, so they can stay open.
- **Status colors:** `upcoming` and `due-today` are both amber, separated only by `amber-700` vs `amber-800`.
- **Toasts:** state is a single string, so a second action replaces the first before it is read.
- **Extension download:** "Get the extension" is a `mailto:` ([IntegrationsView.tsx:48-56](../components/IntegrationsView.tsx)) even though a built zip exists in `dist/`.
- **Hardcoded admin gate:** `userEmail === 'growwithjey@gmail.com'` in [Sidebar.tsx:81](../components/Sidebar.tsx). This is a client-side check only; the real gate should be server-side.

---

## 3. Proposed fixes (not yet implemented)

Ranked by impact against effort. Nothing here touches `hirely-extension/`.

| # | Fix | Example |
|---|-----|---------|
| 1 | Make Import modal real | CSV becomes a file input plus parse and bulk insert. LinkedIn and Outlook link to the Integrations tab. API/Zapier is labeled "Coming soon". |
| 2 | Custom delete confirm modal | Replace `window.confirm(...)` with a shared `ConfirmModal` used by `ContactCard` and `ContactListView`. |
| 3 | Stacking toasts | Change `useState<string \| null>` to a queue of `{id, message}` with per-toast timers. |
| 4 | Real `⌘K` | Add a `keydown` listener that focuses the search input on Cmd/Ctrl+K. |
| 5 | Focus rings | Add `focus-visible:ring-2 focus-visible:ring-blue-500` to nav items, stat cards and rows. |
| 6 | Direct extension download | Copy the zip to `public/downloads/` and link `<a href="/downloads/hirely-extension-1.3.0.zip" download>`. |
| 7 | Distinct status colors | Give `due-today` its own color (for example orange) so it differs from `upcoming`. |

**Deferred (larger architectural changes):** mobile-responsive layout (sidebar collapse, panel as a sheet) and URL-backed routing per view.

---

## 4. Feature-by-feature suggestions

### Dashboard (Home)
- Trend indicators on stat cards ("+5 this week", "down 12% vs last week").
- Inline quick-add row instead of always opening a modal.
- Personal goal tracker (for example "12 of 20 outreach this week").
- Recent activity feed aggregated across all contacts.

### Contacts / Contact list
- User-defined saved views. The six current views are hardcoded.
- Tags and labels ("hot lead", "passive", "do not contact").
- Duplicate detection at save time.
- CSV export.
- Column picker for the table view.

### Follow-ups / Pipeline
- Drag-and-drop between Today, Coming up and Done.
- Recurring cadences ("every 7 days until they reply").
- Snooze from the card itself.
- Calendar sync (Google Calendar or `.ics` export).

### AI Drafts
- Editable draft before sending. Today it is Copy or `mailto:` only.
- Tone selector (casual, formal, shorter).
- Tie drafts to Analytics to show which style gets replies.

### Analytics
- Adjustable date range. Charts are hardcoded to the last 6 weeks and 6 months.
- Period-over-period deltas on each metric.
- Export or share (PDF or CSV).

### Email finder (Enrichment)
- Domain-wide search to save credits when working a whole account.
- Surface confidence and evidence as visible text, not only a `title` tooltip.

### Hirely Meet
- **Turn on audio uploads.** The feature is fully built but gated off with `AUDIO_UPLOADS_ENABLED = false` in [MeetView.tsx:5](../components/MeetView.tsx).
- Extract action items as a checkable list.
- More meeting types than the current three fixed ones.

### Integrations / Settings
- **No account settings page.** The bottom-left "Settings" item opens `IntegrationsView`. There is nowhere to change name or password, or manage plan and billing.
- Live connection status instead of static install steps.
- Notification preferences (digest and reminder emails).

### Cross-cutting
- Onboarding checklist for first-time users.
- Global notification bell or inbox.
- Dark mode.

---

## 5. Housekeeping

- `.claude/launch.json` was created during the audit as a local dev-server launch config. It is untracked and can be deleted if not wanted.
- No source files were modified.
