# CRM n8n Workflows

## ⚠️ "Failed to fetch" on login? Read this first

This error means the browser's `fetch()` call never got a response at all —
most commonly because of **CORS**. n8n webhooks don't send
`Access-Control-Allow-Origin` headers by default, so your React app running on
`http://localhost:5173` gets silently blocked from calling
`https://your-n8n-domain/webhook/user-login`.

**Check in your browser DevTools → Console/Network tab** when you retry sign-in:
- A red CORS policy error in the Console → confirmed, it's this.
- The Network tab shows the request never completing / no response → could be
  CORS, or could be that the URL in `.env.local` is wrong, or n8n isn't
  reachable at all. Try opening the webhook URL directly in a new browser tab
  (for a GET one like `get-tasks`) — if that also fails, it's not CORS, it's
  connectivity.

**Fix:** every `Respond to Webhook` node needs
`Access-Control-Allow-Origin`/`-Methods`/`-Headers` response headers, **and**
browsers send a preflight `OPTIONS` request before any POST with a JSON body
(like `user-login`), which needs its own webhook node replying `204` with the
same headers. The `tasks-crud.json` workflow below has this pattern fully
built out (including the OPTIONS preflight handler) — copy that pattern into
your existing `user-login`/`user-sign-up` workflow, and into
`companies-crud.json`/`pipeline-crud.json`, which don't have it yet. I can
patch those two for you now if you'd rather not do it by hand — just say so.

---



Import `companies-crud.json` into n8n (Workflows → Import from File). It contains 6
webhook endpoints, each wired straight to a Postgres node against the
`companies` table from `enterprise-crm-schema.sql`:

| Webhook path             | Method | What it does                                                   |
|---------------------------|--------|------------------------------------------------------------------|
| `get-companies`           | GET    | Active companies (`is_archived = false`), with `owner_name`, `contact_count`, `opportunity_count` joined in |
| `get-archived-companies`  | GET    | Archived companies (`is_archived = true`)                       |
| `add-companies`           | POST   | Inserts a new row                                                |
| `update-companies`        | POST   | Updates name/website/industry/location/phone/owner by `id`       |
| `archive-companies`       | POST   | Sets `is_archived = true` for an array of `ids` (soft delete)    |
| `delete-companies`        | POST   | Hard `DELETE` for an array of `ids` (permanent, admin-only in the UI) |

## Before you activate it

1. **Set your Postgres credential.** Every Postgres node currently points at
   `"REPLACE_WITH_YOUR_POSTGRES_CREDENTIAL_ID"` — open each node in the n8n
   editor and pick (or create) your real Postgres credential. n8n won't let
   you activate the workflow until all 6 are set.
2. **Double-check the `queryReplacement` syntax against your n8n version.**
   Parameterized queries (`$1, $2, ...` + a JS array expression) are how the
   Postgres node has worked in recent n8n versions, but this changed across
   versions in the past — if the node UI shows something different (e.g. a
   "Query Parameters" fixed-collection instead of a single expression field),
   just re-enter the same values in whatever field your version exposes.
3. **No auth check on the webhooks themselves.** Like your existing
   `add-contact`/`update-contact` workflows, these trust whatever hits the
   endpoint — the `Authorization: Bearer <token>` header is sent by the
   frontend but nothing here validates it against `users`/a sessions table.
   Anyone with the webhook URL can currently call these directly, bypassing
   the app's role checks entirely. Worth adding an early "Verify Session" step
   (calling the same logic as your `verify-session` workflow) before the
   Postgres node, especially before you sell this — I can build that step if
   you want it standardized across all your workflows at once rather than
   patched in one at a time.
4. **`created_by`** on insert is set from `requester_id` if the frontend sends
   it, falling back to `owner_id` — the current React app doesn't send
   `requester_id` yet on Add Company. I can wire that through (same pattern
   your old `submitEditContact` used: decode it from the auth token) if you
   want accurate "created by" tracking.

## Known gap: role enforcement

`delete-companies` is exposed as a plain webhook with no role check — the
"admin-only" restriction currently lives **only in the React UI** (the button
doesn't render for non-admins). That's not real security. Same caveat applies
to your existing `delete-contacts` workflow. If this is going to be sold to
other people, this needs server-side enforcement before launch — happy to
build that as a shared "auth guard" sub-workflow n8n can call at the top of
every write endpoint.

---

## Pipeline CRUD

Import `pipeline-crud.json`. It contains 7 webhook endpoints against
`pipelines`, `stages`, and `opportunities`:

| Webhook path                  | Method | What it does                                                       |
|--------------------------------|--------|------------------------------------------------------------------------|
| `get-pipelines`                | GET    | All pipelines, default first                                          |
| `get-stages?pipeline_id=`      | GET    | Stages for a pipeline, ordered by `display_order`                     |
| `get-opportunities?pipeline_id=`| GET   | Opportunities for a pipeline, joined with contact/company/owner names |
| `add-opportunity`              | POST   | Inserts a new opportunity, defaults `status = 'Open'`                 |
| `update-opportunity`           | POST   | Partial update by `id` (any field the UI sends; unsent fields untouched via `COALESCE`) |
| `move-opportunity-stage`       | POST   | Lightweight endpoint for kanban drag-and-drop — moves `stage_id` **and automatically sets `status`/`closed_at`/`probability`** based on the target stage's name/`win_probability` |
| `delete-opportunities`         | POST   | Hard `DELETE` for an array of `ids`                                    |

### How "Mark Won / Mark Lost" and stage auto-detection work

`move-opportunity-stage` inspects the target stage's **name** with
`ILIKE '%won%'` / `ILIKE '%lost%'` to decide whether to flip `status` and stamp
`closed_at`. This matches your seeded stages (`Closed Won`, `Closed Lost`) —
but it's a naming convention, not a real flag. If you ever rename those stages
to something that doesn't contain "won"/"lost", this logic silently breaks.
**More robust fix:** add a `is_won BOOLEAN` / `is_lost BOOLEAN` column to
`stages` instead of pattern-matching the name — I can adjust both the SQL and
the seed data if you want that instead.

The "Mark Won"/"Mark Lost" buttons in the deal detail panel call
`update-opportunity` directly (setting `status` + `closed_at`) rather than
`move-opportunity-stage`, since they don't move a card between board columns —
worth deciding if you'd rather those buttons also snap the deal into your
"Closed Won"/"Closed Lost" stage column automatically; right now they only
change status, not stage, so a deal could show "Won" while still sitting in
an earlier column until someone drags it.

### Known gaps

1. **No role/session enforcement**, same caveat as Companies above.
2. **Contact/Company pickers are raw ID inputs** in the Add/Edit Deal modal —
   there's no autocomplete search yet. Worth building a shared "entity picker"
   component once Contacts/Companies data is flowing, reusable across Deals,
   Tasks, and Activities.
3. **`assigned_user` defaults to whoever created the deal** (`requester_id`)
   if the frontend doesn't explicitly send one — same pattern as `created_by`
   on Companies. There's no "assign to teammate" UI yet in the Add/Edit Deal
   modal, only in the detail panel indirectly (not even that, currently) — if
   you want a proper user picker there, say so and I'll add it.
4. **Activity Timeline in the deal detail panel is a placeholder.** Your
   schema's `activities` table (with `opportunity_id`) is exactly what's
   needed for it — this needs a `get-activities?opportunity_id=` endpoint,
   which I haven't built yet since it applies to Contacts too (a shared
   Activities workflow makes more sense than building it twice — let me know
   when you want that).

---

## Tasks CRUD

Import `tasks-crud.json`. Tasks are just the `activities` table filtered to
`type = 'task'` — same table that'll eventually back calls/emails/notes/
meetings too.

| Webhook path     | Method | What it does                                                     |
|-------------------|--------|--------------------------------------------------------------------|
| `get-tasks`       | GET    | All tasks, joined with contact/opportunity/assigned-user names, sorted by due date (nulls last) |
| `add-task`        | POST   | Inserts a new activity row with `type = 'task'`                    |
| `update-task`     | POST   | Partial update by `id` — also used for the checkbox "mark complete" toggle (sends `is_completed` + `completed_at`) |
| `delete-tasks`    | POST   | Hard `DELETE` for an array of `ids` (scoped to `type = 'task'` so it can't accidentally delete a call/email/note row) |

This workflow also includes a full **CORS + OPTIONS preflight example** on
`get-tasks` — see the note above if you're hitting "Failed to fetch".

### Known gaps

1. **No `priority` field** — your `activities` table doesn't have one, so I
   dropped it from the Add/Edit Task form rather than pretend it saves. The
   `tasks.rtf` mockup had priority emoji chips; if you want that back, it
   needs a real column (`ALTER TABLE activities ADD COLUMN priority
   VARCHAR(20)`).
2. **Kanban board view** (To Do/In Progress/Waiting/Completed from the
   mockup) isn't built — the schema only has a boolean `is_completed`, not a
   multi-state status, so a kanban view would need either a new `status`
   column or need to be faked from `is_completed` + `due_at` (2 columns max:
   Open / Completed). Let me know if you want the multi-column version and
   I'll add the schema change + rebuild the board (reusing the same
   `PipelineBoard`/`@dnd-kit` pattern from Sales Pipeline).
3. Same **no role/session enforcement** and **raw ID inputs instead of an
   autocomplete picker** caveats as Companies/Pipeline above.

---

## Calendar Events CRUD

Import `calendar-crud.json`. Calendar events are **not a separate table** —
they're `activities` rows that have `due_at` set, regardless of `type`. This
reuses the exact same table Tasks uses (`type = 'task'`), just without
filtering to that one type — a "Call John Smith" task with a due date and a
"Roof Inspection" calendar event are stored identically, just categorized
differently by the `type` column (`inspection`, `call`, `meeting`, `proposal`,
`material_delivery`, `site_visit`, `personal` — freely extensible since
there's no CHECK constraint on that column).

| Webhook path                  | Method | What it does                                                        |
|---------------------------------|--------|-------------------------------------------------------------------------|
| `get-events?start=&end=`        | GET    | Events with `due_at` in the given date range (inclusive), joined with contact/opportunity/company/assigned-user names |
| `add-event`                     | POST   | Inserts an activity row with the given `type`/`subject`/`due_at`         |
| `update-event`                  | POST   | Partial update by `id` — used for edit, reschedule (`due_at`), and complete (`is_completed`+`completed_at`) |
| `delete-event`                  | POST   | Hard `DELETE` for a single event (frontend sends a 1-item `ids` array)   |

Full CORS + OPTIONS preflight handling included on every endpoint this time
(following the pattern from `tasks-crud.json`).

### Known gaps — this page's mockup asked for more than the schema has

1. **No end-time.** `activities` only has one timestamp (`due_at`), not a
   start/end pair — so events can't show duration, and the Week view just
   places each event at its start time with no visual length. Needs an
   `end_at TIMESTAMPTZ` column if you want that back.
2. **No checklist, no attachments.** The mockup's event detail panel shows a
   checklist ("Confirm appointment", "Take photos", etc.) and file
   attachments — neither has anywhere to live in the current schema. I built
   the UI to show a placeholder message instead of pretending to save data
   that goes nowhere. Would need a `checklist_items` table (event_id, label,
   is_checked) and something for file storage (S3/local disk path + an
   `attachments` table) respectively.
3. **No calendar/color assignment beyond `type`.** The mockup shows a
   "Team Calendar ▾" selector implying multiple calendars — there's nothing
   in the schema for that concept; every event is just one global list right
   now, filtered client-side.
4. **Filters row is mostly a stub in the UI** — the mockup lists Assigned
   User / Event Type / Company / Contact / Pipeline Stage / Calendar / Tags /
   Date Range / Completed-Pending as filter options. I only wired search;
   the rest would follow the exact same dropdown pattern as Contacts/
   Companies/Pipeline's filter rows once you want them built out.
5. Same **no role/session enforcement** caveat as every other workflow above.

---

## Reports CRUD + Snapshot Scheduler

Two workflows here, because one is a request/response API and the other runs
on a timer with nothing to respond to.

**`report_snapshots.sql`** — run this once against your database if you
haven't already (you mentioned you already created the table — double check
it matches this file exactly, since both workflows below depend on the
`UNIQUE (snapshot_date, metric, scope)` constraint for their `ON CONFLICT`
upsert logic to work).

### `reports-crud.json` — 6 read-only endpoints, one per tab

| Webhook path                  | Method | Backs             |
|---------------------------------|--------|---------------------|
| `get-report-overview?days=`     | GET    | Overview tab        |
| `get-report-sales?days=`        | GET    | Sales tab            |
| `get-report-pipeline`           | GET    | Pipeline tab (not date-ranged — it's a live snapshot of current open deals) |
| `get-report-contacts?days=`     | GET    | Contacts tab         |
| `get-report-team?days=`         | GET    | Team tab (admin-only in the UI) |
| `get-report-activities?days=`   | GET    | Activities tab       |

All 6 (except Team) build their entire JSON response **inside the SQL query**
using `json_build_object`/`json_agg`, so the Postgres node's single output row
already matches the frontend's expected shape exactly — the Respond node just
echoes `$json.result` straight through. Team returns one row per rep instead
(matches `TeamReportRow[]`), so it uses the same `allIncomingItems` pattern as
the list endpoints in the other workflows.

Every endpoint has a matching `OPTIONS` preflight handler and CORS headers,
learned from the login troubleshooting — should work cleanly from day one
rather than needing the same round of fixes.

**Trend charts (Overview's revenue line, Contacts' new-contacts line,
Activities' volume line) read from `report_snapshots`, not live data.** If
that table is empty, those charts show "No snapshot history yet" — see below.

### `report-snapshot-scheduler.json` — the piece that actually fills the trend charts

A **Schedule Trigger** (cron `0 1 * * *`, 1:00 AM daily) that writes/updates 3
rows in `report_snapshots` for today's date: `total_revenue` (cumulative
all-time), `new_contacts` (count created today), `activity_volume` (count
created today). Uses `ON CONFLICT ... DO UPDATE` so re-running it the same day
is safe (won't double-count).

**Import this into n8n and toggle it Active separately from the CRUD
workflow** — it's its own workflow, not a sub-part of `reports-crud.json`.
Trend charts will show a flat/empty line until this has run at least once;
after a few days of it running nightly, the trend lines will actually show
movement. If you want to backfill history immediately instead of waiting, you
can manually execute this workflow once per day you want to backfill by
temporarily changing `CURRENT_DATE` in the query to a specific past date, or
I can write a one-off backfill script — let me know if you want that instead
of waiting for it to accumulate naturally.

### Known gaps

1. **`scope` is always `'company'`** — every snapshot is org-wide. Per-rep
   historical trends (e.g. "Sarah's revenue over time") aren't captured, only
   the live `get-report-team` aggregate for the selected date range. The
   `scope` column exists specifically so you can extend this later (snapshot
   per `user_id` instead of `'company'`) without a schema change — just more
   `INSERT` blocks in the scheduler.
2. Same **no role/session enforcement** gap as everywhere else — flagged
   directly as a node note on `get-report-team` in the workflow itself, since
   that's the most sensitive one (every rep's revenue numbers).

---

## Dashboard

`dashboard-crud.json` — one endpoint, `get-dashboard` (+ its OPTIONS
preflight pair), everything the Dashboard page needs in a single round trip:
stat cards (contacts/open deals/revenue/tasks due+overdue/team members/new
today), pipeline funnel by stage (excludes Won/Lost stages — this is "what's
still in flight", not a full funnel), lead source breakdown (for the pie
chart), 5 upcoming tasks, 5 most recent activities (auto-generated
description string, e.g. "Sarah logged a call: Follow up with ABC Roofing"),
and 5 most recent contacts.

Same `json_build_object` pattern as Reports — the whole response shape is
built in SQL so there's no stitching step.

### Known gaps

1. **Pipeline funnel excludes Won/Lost stages** by filtering on stage name
   (`NOT ILIKE '%won%'`/`'%lost%'`) — same fragile naming-convention caveat
   flagged in Pipeline CRUD's README section. Rename those stages and this
   silently breaks.
2. **"Recent Activities" descriptions are auto-generated strings**, not
   stored text — if you want richer formatting (e.g. clickable contact names
   inside the sentence) that needs restructuring into a JSON object per
   activity instead of a flat description string. I kept it simple since the
   mockup just showed plain sentences.
3. Refetches every 30 seconds while the Dashboard page is open (shorter than
   the rest of the app's 15s... actually this is longer/looser on purpose —
   Dashboard doesn't need second-by-second freshness). Adjust
   `refetchInterval` in `src/hooks/useDashboard.ts` if you want it tighter or
   looser.
4. Same **no role/session enforcement** caveat as everywhere else.

---

## Contacts page updates (Filters, row actions, Manage Columns, detail modal redesign)

No new frontend page here — this is a set of changes to the existing Contacts
page and its detail modal. One new workflow (`contact-related-crud.json`),
plus **two changes required to your existing `get-contacts` webhook** that
aren't new files here since that workflow was built before this project
(part of your original vanilla-JS backend) — you'll need to edit it directly
in n8n.

### New: `contact-related-crud.json`

One endpoint, `get-contact-related?contact_id=` (+ OPTIONS), powers the
Company / Deal / Task / Event tree in the contact detail modal's Column 1.
For a given contact it returns:
- **Company** — via `contacts.account_id → companies`
- **Deal** — most recent *open* opportunity for that contact (if any)
- **Task** — nearest incomplete `type='task'` activity for that contact
- **Event** — nearest upcoming non-task activity (calendar event) for that contact

Each is `null` if the contact has none — the frontend shows "No company
linked" / "No open deal" / etc. rather than breaking.

### Required change to your existing `get-contacts` workflow

Two new fields the frontend now expects for the **Filters** modal (filtering
contacts by Pipeline Stage or by whether they have an open task) —
**`get-contacts` needs to start returning these two extra columns**:

```sql
-- add to your existing get-contacts SELECT:
(SELECT st.name FROM opportunities o JOIN stages st ON st.id = o.stage_id
 WHERE o.contact_id = c.id AND o.status = 'Open'
 ORDER BY o.created_at DESC LIMIT 1) AS stage_name,

EXISTS (
  SELECT 1 FROM activities a
  WHERE a.contact_id = c.id AND a.type = 'task' AND a.is_completed = false
) AS has_open_task
```

Until this is added, the Filters modal's **Company** filter works today (it
only needs `company_name`, already present), but **Pipeline Stage** and
**Task** filters will silently match nothing, since `stage_name`/
`has_open_task` will be `undefined` on every contact. I built it this way —
degrading to "no results" rather than crashing or showing wrong data — on
purpose, but you'll want to make this backend change before relying on those
two filters.

### Tags: reusing your existing workflows, not new ones

**Update:** the original diagnosis in this section was incomplete. The real
issue was that `get-contacts` almost certainly never returned an embedded
`tags` array per contact in the first place — your old vanilla app loaded
tags per-contact on demand (`loadTagsForContact` → `get-entity-tags`), not
bundled into the contacts list. The frontend now fetches each contact's tags
directly via `get-entity-tags?entity_type=contact&entity_id=` when the detail
modal opens, instead of trusting a `tags` field on the list payload — so tag
assignment should now actually show up.

**Resolved:** `get-contacts`'s `Build Query` node (in
`contacts-show-to-UI.json`) now embeds a `tags` array per contact via a
`json_agg` subquery over `taggables`/`tags`, so the Contacts table's Tags
column renders real data instead of "--". Re-import/activate that workflow
in n8n to pick up the change.

The Add Tag dropdown (creatable multi-select) and the Owner dropdown in the
detail modal call your **already-existing** tag webhooks from the original
vanilla app: `get-tags`, `create-tag`, `tag-entity`, `untag-entity`,
`get-entity-tags` (plus `get-users`/`assign-contact-owner`, also already
existing). I didn't rebuild these — just confirm the payload shapes match
what the frontend sends:

- `create-tag` — `POST { name: string }` → **must return `{ id, name }`**;
  the frontend now throws a visible error if `id` is missing from the
  response, instead of silently failing.
- `tag-entity` / `untag-entity` — `POST { entity_type: 'contact', entity_id, tag_id }`
  → should return `{ success: true }` (or omit `success` entirely — both are
  treated as success now); returning `{ success: false }` is now surfaced as
  a visible error instead of silently no-op'ing.
- `get-entity-tags` — `GET ?entity_type=contact&entity_id=` → should return
  an array of `{ id, name }`.

If your existing workflows use different field names (e.g. `tagId` instead
of `tag_id`), either update those workflows to match, or tell me the actual
shape and I'll adjust `src/api/contacts.ts` instead — whichever's less work
on your end.

### Correction: Company picker now reuses your existing endpoints

**Update — reversed course from the previous version of this section.** The
`search-companies`/`find-or-create-company` endpoints I invented don't exist
in your n8n and were causing the CORS/network failures you hit. Rather than
building yet more new endpoints, the Company picker now reuses the **same
two webhooks the Companies page already uses successfully**:

- **While typing** → filters the already-fetched `get-companies` list
  client-side (same cached query as the Companies page — no new network call
  per keystroke, no separate search endpoint needed).
- **"+ Create"** → calls `add-companies` (`POST { name }`), same endpoint the
  "+ Add Company" button on the Companies page already uses. On success, the
  returned `id` links the contact via `account_id`.

The `company-search-crud.json` workflow file from the previous message is
**removed** — don't import it, it's no longer used by anything.

### Filters — root cause and fix

Both "Filter by Tags" and "Filter by Company" were broken for the same
underlying reason: they were reading fields (`contact.tags`, `contact.company_name`)
that `get-contacts` most likely never populates in the list response — same
root cause as the earlier tags bug. Fixed by:

- **Tags** — now calls your existing `filter-contacts-by-tag?tag_id=` webhook
  directly (same one used elsewhere) instead of filtering a client-side field
  that was always empty.
- **Company** — the dropdown now lists real companies from `get-companies`
  (already working, used on the Companies page) instead of deriving options
  from contacts' possibly-empty `company_name` field, and filters by
  `account_id` instead of matching text.

**These are workarounds, not full fixes** — the Contacts *table* itself
still can't show company/tags columns correctly until `get-contacts` is
updated with the two joins described earlier in this file (`stage_name`/
`has_open_task`) plus a `company_name` join via `account_id → companies.name`
and a `tags` json_agg. I've now worked around every place that needed those
fields without touching `get-contacts` — but I'd genuinely recommend making
that backend change soon, since more features (bulk actions, exports, the
table's Company/Tags columns) will keep hitting the same gap otherwise.

### Frontend changes summary

- **Filters button** now opens a real modal (Company / Pipeline Stage /
  Task — "has open task" / "no open task" / "has overdue task"), separate
  from the existing inline Tag/Owner/Company/Status filter row (both apply
  simultaneously).
- **Columns button** opens a real checkbox modal, persisted to
  `localStorage` (`contacts-visible-columns`), covering every field on the
  `contacts` table worth toggling. Name stays always-visible.
- **Row actions** — pen (edit) and trash (delete) icons at the end of every
  row. Edit opens the same Add Contact modal in edit mode. Delete follows
  the existing admin-delete/user-archive split, same as the bulk action.
- **Detail modal redesign** — name+avatar moved from the modal's top header
  bar into the top of Column 1 (swapped with where "Contact Details" used to
  sit), Status directly below, then a row with the new Tags dropdown (create
  tags inline if none match) and Owner dropdown (checkbox-style single
  select), then the existing detail fields, then the new Company/Deal/Task/
  Event tree, then Do Not Contact at the bottom.

### `contact-email-crud.json` — new workflow, needs import + your own Postgres credential

**Renamed:** the two webhooks in this file are now `send-email` and
`mark-log-read` (previously `send-contact-email` /
`mark-contact-email-read`) to match the URLs you wanted to test —
`https://<your-domain>/webhook/send-email` and `.../webhook/mark-log-read`.
Every node name, path, and cross-reference (`$('Webhook: send-email')...`
etc.) was renamed together, so re-import the file fresh rather than
patching an already-imported copy — node names have to match exactly for
the `$('Node Name')` expressions to resolve.

**Trying this setup first, before reply-capture:** for now, incoming
replies are expected to just show up through `get-contacts`
(`contacts-show-to-UI.json`) — that query already does `SELECT c.*`, so
once `email_logs` exists as a column (see below) it comes back with every
contact automatically, no separate ingestion pipeline required. Whatever
writes a `received`-type entry into a contact's `email_logs` (manually for
now, or your own mechanism later) will show up in the modal's Activity Log
next time the Contacts page refetches — React Query already does this on
window focus and after any mutation, no extra polling code was added. The
`contact-email-reply-capture.json` IMAP scaffold from before still exists
in this repo if you want it later, but it's not part of this setup — skip
importing it for now.

The contact detail modal's Email action POSTs to `send-email`
(`{ contact_id, subject, message, to, from }`) instead of doing nothing.
This is a **new** workflow file — `add-contact`/`update-contact`/etc. aren't
in this repo at all (same "original vanilla-JS backend" situation as the
rest of Contacts CRUD), so I couldn't extend an existing one; import
`contact-email-crud.json` and set its Postgres credential like the others.

`to`/`from` come from the frontend, not looked up server-side: `to` is the
contact's `email`, `from` is the logged-in user's `email` (both from
`ComposeEmailPopover.tsx` — sending is blocked client-side if either is
missing). They're stored on the log entry and are exactly what you'd wire
into a real Send Email / Gmail node's To/From fields later.

What it does: appends a `{ id, type: 'sent', subject, message, to, from,
attachments, sent_at, is_read: true }` entry onto the contact's
`email_logs`, which is what the detail modal's Activity Log column already
reads — so a "sent" message shows up there immediately after sending, same
as before. `id` is a fresh `gen_random_uuid()` (built into Postgres core
since v13, no extension needed) — it's what lets `mark-log-read` (below)
target one specific log entry later.

**Attachments (added later):** `ComposeEmailPopover.tsx` now supports
picking files (capped client-side at 3 files / 4MB each) and reads them as
base64 `data:` URLs via `FileReader` — no upload endpoint or file storage
exists for this app, so `attachments: [{ name, url }]` rides along in the
same JSON POST body as `subject`/`message`, and gets stored inline on the
log entry (`jsonb_build_object('attachments', COALESCE($5::jsonb, '[]'))`).
The Activity Log renders each as a small clickable chip
(`<a href={dataUrl} download>`) — clicking downloads/opens it directly,
no backend round-trip needed since the whole file lives in the JSON.

Two things worth knowing:
- **This bloats the `contacts` row.** A base64 PDF is ~33% larger than the
  original file, and it's stored per-entry, forever, inline on the
  contact — fine for occasional small attachments (the 4MB/3-file cap
  keeps a single email under ~16MB), but not a real file storage strategy.
  If attachments become a real feature, move to actual object storage
  (S3/R2/etc.) and store a URL instead of the base64 blob.
- **Watch your webhook body size limit.** n8n's webhook (and ngrok, on the
  free tier) may reject request bodies past a certain size — 3 files at
  the cap could approach ~16MB once base64-inflated. If you get a
  size-limit error sending multiple large attachments, either lower the
  client-side caps in `ComposeEmailPopover.tsx` or raise your n8n
  instance's payload size limit.

**Correction:** the first version of this workflow assumed `email_logs`
already existed as a column on `contacts` (the frontend's `Contact` type
had always modeled it, so I trusted that). It doesn't — testing it live
threw `column "email_logs" does not exist`. Both flows now run
`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_logs jsonb DEFAULT
'[]'::jsonb;` in a `Postgres: Ensure email_logs Column (...)` node right
before they touch the column, so it gets created automatically on first
use — `IF NOT EXISTS` makes it a safe no-op every run after that. This is
what also makes replies show up via `get-contacts` per the note above,
once you (or whatever writes replies) start populating the column.

**Second correction:** inserting that node broke the query params on the
node right after it. n8n Postgres nodes replace `$json` with their own
output for the next node — the Ensure-Column node returns nothing
`body`-shaped, so `$json.body.subject` (etc.) on the following node
resolved to `undefined` and n8n rejected it ("Query Parameters must be a
string of comma-separated values or an array of values"). Fixed by having
`Postgres: Append Email Log` and `Postgres: Mark Email Read` reference
their origin webhook node explicitly —
`$('Webhook: send-email').item.json.body.subject` instead of
`$json.body.subject` — which resolves correctly regardless of what runs in
between. If you add more nodes into either chain later, use the same
`$('Node Name').item.json...` pattern rather than bare `$json` once more
than one node sits between the data's source and where it's used.

**Third correction:** this file originally *also* contained the IMAP
reply-capture nodes, with a placeholder `REPLACE_WITH_YOUR_IMAP_CREDENTIAL_ID`
credential. n8n activates/deactivates an entire workflow as one unit —
since that credential couldn't resolve, the **whole workflow** stayed stuck
on "Action Required" and never activated, so `send-email`/`mark-log-read`
weren't live on their production URLs either, even though those two flows
had nothing to do with IMAP. The IMAP nodes now live in their own file,
`contact-email-reply-capture.json` — see the note above on why it's not
part of this setup for now.

Things you'll still need to sort out on your end:
- **This does not actually send an email.** It only logs that one was
  "sent." If you want real delivery, add a Send Email / Gmail node (with
  your own SMTP or OAuth credential) before the Postgres node — I can't set
  that up blindly since I don't know your email provider.
- **Pre-existing log entries have no `id`.** Anything logged before this
  change can't be individually marked read (harmless no-op) — only new
  entries going forward are targetable.
- If you'd rather manage the schema yourself (e.g. via a migration instead
  of an auto-`ALTER`), just delete the two `Ensure email_logs Column` nodes
  in this file and run that one `ALTER TABLE` statement by hand once.

#### `mark-log-read` — click-to-read

The Activity Log entries in the contact modal are clickable. Clicking an
unread "received" entry (the highlighted/emerald one) POSTs
`{ contact_id, log_id }` to this webhook, which flips that one entry's
`is_read` to `true` by rebuilding `email_logs` via
`jsonb_array_elements` + `CASE WHEN elem->>'id' = $1`. The UI already
recolors read vs. unread (`ContactDetailModal.tsx`'s `isUnread` check) —
this just makes that flip persist instead of resetting on next fetch.

**Gotcha confirmed live:** entries without an `id` field can't be targeted —
`canMarkRead` in `ContactDetailModal.tsx` requires `!!log.id`, so clicking
one only expands it, silently skipping the mark-read call (this was
already flagged as a known limitation, but it's worth calling out
explicitly since it's what you'll hit testing with manually-inserted rows,
e.g. via `psql`, since there's no automated reply-ingestion running yet).
The frontend now shows a visible error if the webhook call itself fails,
but a missing `id` isn't a failure — it's just not clickable by design.

One-time backfill for existing rows that predate the `id` field (safe to
run anytime — only touches entries that don't already have one):

```sql
UPDATE contacts
SET email_logs = (
  SELECT jsonb_agg(
    CASE WHEN elem ? 'id' THEN elem
         ELSE elem || jsonb_build_object('id', gen_random_uuid()::text)
    END
  )
  FROM jsonb_array_elements(email_logs) AS elem
)
WHERE email_logs IS NOT NULL AND email_logs <> '[]'::jsonb;
```

Any future manual test inserts should include an `id` (e.g.
`gen_random_uuid()::text`) up front so they're clickable immediately.

