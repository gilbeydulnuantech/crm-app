# n8n Workflows Reference

A reference of every n8n workflow in this CRM — name, what triggers it /
webhook path, and what it does. Generated 2026-09-18 by reading each
workflow's trigger nodes directly out of the live JSON files, so triggers/
webhook paths are accurate; descriptions come from working inside most of
these files across this session plus naming conventions for the rest (see
notes at the bottom for which ones deserve a closer look before you build
new automation-engine rules against them).

## Core CRM data (CRUD)

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **contacts-show-to-UI** (`contacts-show-to-UI.json`) | `GET /get-contacts` | Main contact list fetch — powers the Contacts page and (via 15s polling) the notification bell. |
| **contact: add** (`contact_ add.json`) | `POST /add-contact` | Internal "add contact" (rep-created, not public form). Dispatches `dispatch-contact-created` after insert. |
| **contacts-update** (`contacts-update.json`) | `POST /update-contact`, `GET /unsubscribe-public` | Edits a contact's fields; public unsubscribe link handler. |
| **contacts: archive** (`contacts_ archive.json`) | `POST /archive-contact`, `POST /restore-contacts` | Archive/restore contacts (soft delete). |
| **contacts-delete** (`contacts-delete.json`) | `POST /delete-contacts` | Hard-deletes contacts. |
| **contacts-search** (`contacts-search.json`) | `POST /global-search` | Global search bar (contacts + likely other entities). |
| **filters: contacts-by-stage** (`filters_ contacts-by-stage.json`) | `GET /get-contacts-by-stage` | Contacts filtered by pipeline stage (used in stage-based views). |
| **import-contacts** (`import-contacts.json`) | `POST /import-contacts` | Bulk CSV/list contact import. |
| **Merge Contacts** (`Merge Contacts.json`) | `POST /merge-contacts` | Merges duplicate contact records. Confirmed active in n8n on 2026-10-04. |
| **Contact Related Records** (`Contact Related Records.json`) | `GET /get-contact-related` | Fetches a contact's related deals/tasks/etc. for the detail modal. |
| **Contact status system** (`Contact status system.json`) | `POST /contact-status-system` | Manages a contact's status field/lifecycle transitions. |
| **contacts-Tags System** (`contacts-Tags System.json`) | `GET /get-tags`, `POST /create-tag`, `POST /tag-entity`, `POST /untag-entity`, `GET /get-entity-tags`, `GET /filter-contacts-by-tag` | Generic, reusable tagging system for any entity (contact/deal/company) — the shared tag-apply endpoint other workflows call into. |
| **Enrich Contact From Website** (`Enrich Contact From Website.json`) | `POST /enrich-contact` | Scrapes/enriches a contact's data from their website. |
| **Bulk Enrich Contacts** (`Bulk Enrich Contacts.json`) | `POST /bulk-enrich-contacts` | Batch version of the above. |
| **Companies-add-delete-system** (`Companies-add-delete-system.json`) | `GET /get-companies`, `GET /get-archived-companies`, `POST /add-companies`, `POST /update-companies`, `POST /archive-companies`, `POST /delete-companies`, `POST /restore-companies` | Full CRUD for companies. |
| **Company Profile** (`Company Profile.json`) | `GET /get-company-profile`, `POST /save-company-profile`, `POST /upload-company-logo` | Company detail/profile page backing. |
| **Pipeline** (`Pipeline.json`) | `GET /get-pipelines`, `GET /get-stages`, `GET /get-opportunities`, `POST /add-opportunity`, `POST /update-opportunity`, `POST /move-opportunity-stage`, `POST /delete-opportunities`, `POST /pipeline-create-new`, `POST /update-pipeline`, `POST /delete-pipeline`, `POST /update-pipeline-stages`, `GET /get-archived-opportunities`, `POST /archive-opportunities`, `POST /restore-opportunities` | The deal/opportunity + pipeline-stage engine — largest CRUD surface, backs the whole Kanban board. `move-opportunity-stage` is the generic stage-advance endpoint other workflows call into (e.g. Deal Stage Tag Sync Engine). |
| **Tasks** (`Tasks.json`) | `GET /get-tasks`, `POST /add-task`, `POST /update-task`, `POST /delete-tasks`, `GET /get-archived-tasks`, `POST /archive-tasks`, `POST /restore-tasks`, `POST /set-task-subtasks`, `POST /set-task-attachments`, `POST /set-task-watchers`, `GET /get-task-statuses`, `POST /create-task-status`, `POST /update-task-status`, `POST /delete-task-status` | Full task management (also backs the deal-card activity indicator). |
| **Calendar Events** (`Calendar Events.json`) | `GET /get-events`, `POST /add-event`, `POST /update-event`, `POST /delete-event` | Internal calendar/meeting events CRUD. |
| **Calendar Integrations** (`Calendar Integrations.json`) | `GET /get-calendar-integrations`, `POST /add-calendar-integration`, `POST /update-calendar-integration`, `POST /delete-calendar-integration` | Manages connected external calendars (Google Calendar OAuth connections) per user. |
| **Notes** (`Notes.json`) | `GET /get-notes`, `POST /add-note`, `POST /update-note`, `POST /delete-note` | Freeform notes attached to any entity. |
| **Saved Views** (`Saved Views.json`) | `GET /get-saved-views`, `POST /add-saved-view`, `POST /delete-saved-view`, `POST /update-saved-view` | Saved filter/view presets (e.g. custom Contacts list filters). |
| **Tickets** (`Tickets.json`) | `GET /get-tickets`, `GET /get-ticket`, `POST /create-ticket`, `POST /update-ticket`, `POST /add-ticket-comment`, `POST /archive-ticket`, `POST /create-ticket-public` | Support ticket system (internal + public-facing creation). |
| **Users: Assignment** (`Users_ Assignment.json`) | `GET /get-users`, `POST /assign-contact-owner`, `POST /update-user-color`, `POST /update-user-theme`, `POST /update-notification-preferences`, `GET /get-all-users`, `POST /update-user-role`, `POST /update-user-active`, `POST /upload-avatar`, `POST /change-password`, `POST /update-user-phone`, `POST /upload-content-image`, `POST /update-user-timezone` | User/rep management — roles, ownership assignment, profile settings. |
| **user-signup-login** (`user-signup-login.json`) | `POST /user-sign-up`, `POST /user-login`, `POST /verify-session`, `POST /logout` | Auth: signup, login, session verification, logout (uses the real `sessions` table + random tokens fixed earlier this session). |
| **Verify Session** (`Verify Session.json`) | execute-workflow (internal only, no webhook) | Shared sub-workflow every session-gated endpoint calls to validate a bearer token against the `sessions` table. |
| **Resources** (`Resources.json`) | `GET /get-resources`, `POST /add-resource` | Generic shared resources/files list. |
| **Pages** (`Pages.json`) | `GET /get-pages`, `POST /save-page`, `POST /delete-page` | CMS-style internal pages/content. |

## Public-facing / lead capture

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **Contact Public Form** (`Contact Public Form.json`) | `POST /add-contact-public` | Public lead-capture form submission → creates contact, fires `dispatch-contact-created`. Leaner sibling of New Contact Entry (no confirmation email). |
| **New Contact Entry** (`New Contact Entry.json`) | `POST /add-contact-public`, `POST /add-contact` | The fuller version: creates/upserts contact, logs activity, sends a template-driven "Thank You" email (`email_templates` id 12), logs to `email_logs`. |
| **Public Booking** (`Public Booking.json`) | `GET /get-availability-public`, `POST /book-inspection-public`, `POST /book-inspection-followup`, `GET /get-availability-generic`, `POST /book-inspection-generic`, `GET /cancel-booking-public` | The public inspection-booking flow — creates the deal (`opportunities`, pipeline_id=3, stage_id=19 "booked"), books a calendar slot, syncs to Google Calendar, sends a (hardcoded, not template-driven) confirmation email. |
| **contacts-add-by-calendar-booking** (`contacts-add-by-calendar-booking.json`) | Google Calendar Trigger (polling) | Watches a connected Google Calendar for new bookings made directly on the calendar (not through the public form) and creates a matching contact. |
| **Google Maps Lead Import** (`Google Maps Lead Import.json`) | `POST /import-maps-leads` | Scrapes/imports leads from Google Maps. **Confirmed dead — webhook doesn't resolve live.** |
| **Retell Voice Booking Tools** (`Retell Voice Booking Tools.json`) | `POST /retell-check-availability`, `POST /retell-book-appointment` | Tool endpoints an AI voice agent (Retell) calls to check slots and book an inspection over a phone call. |
| **Retell Outbound Call** (`Retell Outbound Call.json`) | `POST /trigger-retell-call` | Kicks off an outbound AI voice call via Retell. |
| **Vapi Voice Booking Tools** (`Vapi Voice Booking Tools.json`) | `POST /vapi-check-availability`, `POST /vapi-book-appointment` | Same as the Retell version, for the Vapi voice-AI platform. |
| **Vapi Outbound Call** (`Vapi Outbound Call.json`) | `POST /trigger-vapi-call` | Kicks off an outbound AI voice call via Vapi. |

## Email — sending, tracking, templates

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **contacts-mail-send** (`contacts-mail-send.json`) | `POST /send-email` | Manual one-off email send from the Contact Detail modal. |
| **contacts-email-reply** (`contacts-email-reply.json`) | Gmail Trigger (polling inbox) | Watches Gmail for inbound replies, logs them to the contact's `email_logs` (marks prior sent email read), uploads attachments, can auto-send a booking-link reply + SMS notification. |
| **Email Open Tracking** (`Email Open Tracking.json`) | `GET /track-email-open` | Tracking-pixel endpoint — marks an `email_logs` entry's `opened_at` when the pixel loads. Not currently wired into the proposal-send flow (no pixel embedded there). |
| **Email Templates** (`Email Templates.json`) | `GET /get-email-templates`, `POST /save-email-template`, `POST /update-email-template-active`, `POST /delete-email-template`, `POST /send-email-template` | CRUD for reusable email templates + a generic "send from template" action. |
| **Email Event Groups** (`Email Event Groups.json`) | `GET /get-email-event-groups`, `POST /save-email-event-group`, `POST /delete-email-event-group` | Groups of email events, likely used to configure nurture-sequence triggers. |
| **Email Nurture Sequence Engine** (`Email Nurture Sequence Engine.json`) | schedule (hourly) | Executes configured multi-step nurture email sequences over time. |
| **Nurture Sequences** (`Nurture Sequences.json`) | `GET /get-nurture-sequences`, `POST /save-nurture-sequence`, `POST /update-nurture-sequence-active`, `POST /delete-nurture-sequence` | CRUD for nurture sequence definitions the Engine above executes. |
| **Nurture Sequence Test Tools** (`Nurture Sequence Test Tools.json`) | `POST /test-nurture-step`, `POST /force-run-nurture-sequence` | Manual test/force-run tools for nurture sequences (admin debugging). |
| **Draft Deal Follow-Up** (`Draft Deal Follow-Up.json`) | `POST /draft-deal-followup` | AI-assisted drafting of a follow-up email for a specific deal. |
| **Contacts-Email-log** (`Contacts-Email-log.json`) | `POST /mark-log-read` | Marks an email log entry as read (manual "mark as read" action, distinct from the open-tracking pixel). |

## Automation & rules engine

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **Automations** (`Automations.json`) | `GET /get-automations`, `POST /save-automation`, `POST /update-automation-active`, `POST /delete-automation`, `POST /test-automation` | CRUD API for the `automations`/`automation_actions` rule tables (backend only — no creation UI exists in the frontend yet). |
| **Automation Engine** (`Automation Engine.json`) | schedule (every 30 min) | The rule executor — reads active automations, evaluates one trigger condition + one true/false branch per rule, runs allowlisted actions (add tag, send email, update field incl. stage_id, generate proposal/contract, team notification, wait). Logs every firing to `automation_runs`. No webhook — zero external attack surface. |
| **Automation Dispatch** (`Automation Dispatch.json`) | `POST /dispatch-contact-created` | Event-driven (instant) counterpart to the polling engine — but only for `trigger_type='contact', trigger_event='created'` automations that have been compiled into their own standalone workflow. |
| **Automation Logs** (`Automation Logs.json`) | `GET /get-automation-runs`, `GET /get-automation-run-stats`, `GET /get-workflow-run-logs` | Read endpoints backing the Automation Logs page (both the rule-engine's `automation_runs` and the generic `workflow_run_log`). |
| **List n8n Workflows** (`List n8n Workflows.json`) | `GET /get-n8n-workflows`, `GET /get-automation-email-steps`, `POST /update-automation-email-step` | Lists live n8n workflows tagged `automation` (backs the read-only Automations page) + lets a rep edit per-step email copy on a workflow. |
| **Log Workflow Run** (`Log Workflow Run.json`) | execute-workflow (internal only) | Shared sub-workflow ~every other workflow calls to write an entry to `workflow_run_log` — the generic execution-audit trail. |
| **Deal Stage Tag Sync Engine** (`Deal Stage Tag Sync Engine.json`) | `POST /deal-stage-tag-sync` | Rebuilt this session — receives `{opportunity_id, stage_name, contact_id}` from Pipeline's stage-move; when `stage_name = "inspection done"`, tags the linked contact "Hot Lead". No longer syncs a tag per pipeline stage. |
| **Deal Intelligence Engine** (`Deal Intelligence Engine.json`) | schedule (every 15 min), `POST /recompute-win-scores` | Recomputes each open deal's win-probability score. |
| **Lead Scoring Engine** (`Lead Scoring Engine.json`) | schedule (every 15 min), `POST /recompute-lead-scores` | Recomputes lead-quality scores for contacts. |
| **Deal Won Engine** (`Deal Won Engine.json`) | schedule (every 30 min), manual test webhook | Handles post-"Closed Won" follow-up automation (e.g. onboarding sequence). |
| **Deal Lost Engine** (`Deal Lost Engine.json`) | schedule (every 30 min), manual test webhook | Handles post-"Closed Lost" follow-up automation (e.g. win-back sequence). |
| **Deal Document Flow Engine** (`Deal Document Flow Engine.json`) | schedule, manual test webhook | Automated document generation/delivery tied to deal stage/state. |
| **Deal Document Flow** (`Deal Document Flow.json`) | `GET /get-document-flows`, `POST /save-document-flow`, `POST /update-document-flow-active`, `POST /delete-document-flow` | CRUD for the document-flow rules the Engine above executes. |
| **Post-Sale Maintenance Engine** (`Post-Sale Maintenance Engine.json`) | schedule (daily), `POST /run-maintenance-followups` | Post-sale maintenance/check-in follow-up automation. |
| **Pipeline Stage Reminder Engine** (`Pipeline Stage Reminder Engine.json`) | schedule (every 30 min) | Sends reminders when a deal has been stuck in a stage too long. |
| **Pipeline Stage Reminders** (`Pipeline Stage Reminders.json`) | `GET /get-stage-reminders`, `POST /save-stage-reminder`, `POST /update-stage-reminder-active`, `POST /delete-stage-reminder` | CRUD for the stage-reminder rules the Engine above executes. |
| **Stage Reminder Test Tools** (`Stage Reminder Test Tools.json`) | `POST /test-stage-reminder-step`, `POST /force-run-stage-reminder` | Manual test/force-run tools for stage reminders. |
| **Task Reminders** (`Task Reminders.json`) | schedule (every 5 min) | Sends reminders for upcoming/overdue tasks. **Currently inactive.** |
| **Book confirmed: email reminders** (`Book confirmed_ email reminders.json`) | schedule (every 15 min), manual/force-run + status webhooks | Sends reminder emails for confirmed inspection bookings. |

## Proposals, contracts, payments

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **Proposals** (`Proposals.json`) | `GET /get-proposals`, `POST /save-proposal`, `POST /send-proposal`, `POST /archive-proposal`, `POST /delete-proposal`, `GET /get-proposal-public`, `POST /approve-proposal-public`, `GET /get-proposal-approved`, `POST /mark-proposal-emailed` | Full proposal lifecycle. `get-proposal-public`/`approve-proposal-public` advance the deal's stage directly via SQL on first view/approval — not via the `move-opportunity-stage` webhook. |
| **Proposal Templates** (`Proposal Templates.json`) | `GET /get-proposal-templates`, `POST /save-proposal-template`, `POST /delete-proposal-template` | CRUD for reusable proposal templates. |
| **Contracts** (`Contracts.json`) | `GET/POST` across `get-contract-public`, `sign-contract-public`, `get-contracts`, `save-contract`, `send-contract`, `archive-contract`, `delete-contract`, `get-contract-signed`, `send-signed-contract-email`, `generate-contract-pdf`, `cosign-contract` | Full contract lifecycle incl. public signing flow and PDF generation. Largest single file (110 nodes). |
| **Contract Templates** (`Contract Templates.json`) | `GET /get-contract-templates`, `POST /save-contract-template`, `POST /delete-contract-template` | CRUD for reusable contract templates. |
| **Scope Of Work Templates** (`Scope Of Work Templates.json`) | `GET /get-scope-templates`, `POST /save-scope-template`, `POST /delete-scope-template` | CRUD for scope-of-work templates (likely attached to proposals/contracts). |
| **Payments** (`Payments.json`) | Large surface: `get-payments`, `get-invoices`, `get-payment`, `create-invoice`, `create-payment`, `update-payment`, `add-payment-note`, `send-receipt`, `archive-payment`, `update-invoice`, `void-invoice`, `get-invoice`, `send-invoice`, plus invoice/receipt template CRUD | Full payments/invoicing system. Largest file overall (193 nodes). |

## Infrastructure / shared utilities

| Workflow (file) | Triggers | What it does |
|---|---|---|
| **Verify Session** (`Verify Session.json`) | execute-workflow | (listed above) shared session-check sub-workflow. |
| **Log Workflow Run** (`Log Workflow Run.json`) | execute-workflow | (listed above) shared execution-logging sub-workflow. |
| **Global Error Trigger** (`Global Error Trigger.json`) | error-trigger | Catches unhandled errors across other workflows (n8n's built-in error-workflow mechanism). |
| **Image Proxy** (`Image Proxy.json`) | `GET /image-proxy` | Proxies/serves images (likely to work around CORS/hotlinking for external images). |
| **Integrations** (`Integrations.json`) | `GET /get-integrations`, `POST /save-integration`, `POST /delete-integration` | Manages third-party integration connections/credentials. |
| **Entity Activity Log** (`Entity Activity Log.json`) | `GET /get-entity-activity`, `POST /add-entity-activity`, `GET /get-global-audit-log` | The generic per-entity Activity Log (contacts/deals/companies) + a global audit log. |
| **TeamChat** (`TeamChat.json`) | `GET /get-conversations`, `GET /get-messages`, `POST /send-message`, `POST /mark-conversation-read`, `POST /start-dm` | Internal team direct-messaging feature. |
| **Google Calendar Sync** (`Google Calendar Sync.json`) | schedule (every 5 min) | Two-way sync between internal Calendar Events and connected Google Calendars. |
| **Report Snapshot Scheduler** (`Report Snapshot Scheduler.json`) | schedule (daily, 1am) | Takes a daily snapshot of report data. |
| **Reports** (`Reports.json`) | `GET` across `get-report-overview`, `get-report-sales`, `get-report-pipeline`, `get-report-contacts`, `get-report-team`, `get-report-activities` | Read endpoints backing the Reports dashboard. |
| **Observability Dashboard** (`Observability Dashboard.json`) | `GET /observability-dashboard`, `GET /get-automation-error-log` | System health / automation-error visibility dashboard. |
| **Dashboard** (`Dashboard.json`) | `GET /get-dashboard` | Main CRM homepage dashboard data. |

---

## Notes on this list

- **82 workflow files total.** `active=False` only on **Task Reminders** (Merge Contacts confirmed active in n8n on 2026-10-04) — everything else is currently live.
- Descriptions above come from a mix of: reading each file's trigger nodes/webhook paths directly out of the live JSON (accurate), and knowledge from working inside ~30 of these files this session plus reasonable inference from naming for the rest — **treat unfamiliar/rarely-touched ones (Deal Intelligence Engine, Lead Scoring Engine, Deal Document Flow, Post-Sale Maintenance Engine, Book confirmed reminders, TeamChat, Retell/Vapi tools) as best-effort summaries worth a closer look before relying on them for the automation-engine redesign**, since these files have not been read in depth this session.
- Only ~8 of 274 total trigger nodes across all files have a human-written `notes` field documenting their payload — most of this list is derived from path/name conventions, not authored documentation. Worth adding notes to the important ones as you go, same pattern already used on `Deal Stage Tag Sync Engine.json`'s webhook.
