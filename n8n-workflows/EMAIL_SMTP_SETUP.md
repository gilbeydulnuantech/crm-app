# Email sending: SMTP (no Gmail OAuth)

Every CRM workflow that sends email now uses n8n's **Send Email (SMTP)** node with
the n8n credential **"SMTP account"**, sending from
`gilbeydulnuan@gmail.com`. Gmail OAuth credentials are no longer used
for sending, so there is no 7-day OAuth token expiry. (An SMTP app password
stays valid until it is revoked or the Google account password changes.)

## What changed versus the Gmail nodes
- Sender display name (company name) is kept: `"Company" <address>`.
- HTML/text format, subject, attachments and "continue on error" behaviour are kept.
- The "n8n attribution" footer is off.
- SMTP does not return Gmail's `threadId`/`id`. The four places that stored them in
  `email_sends` now store `thread_id = NULL` and `message_id = <SMTP Message-ID>`.
  Reply matching never used the thread id (it matches the sender's email address).
- Limit: a regular Gmail account allows about 500 recipients/day over SMTP.

## Not converted on purpose
- `Tool - check my Email` (Gmail "get many messages" — SMTP cannot read a mailbox).
- `Ai Job Scraper + CV optimizer` "Create an email draft" (inactive; SMTP has no drafts).

## Inbound replies (IMAP)
`contacts-email-reply` now uses n8n's **Email Trigger (IMAP)** (node "Email Trigger (IMAP)", credential
**Gmail IMAP (gilbeydulnuan)**; sending uses **Gmail SMTP (gilbeydulnuan)**). Both use a Google app password
for gilbeydulnuan@gmail.com.

- The trigger only reads **unread messages since 06-Oct-2026 whose subject contains "Re:"**, and marks them
  read after processing. This is deliberate: the mailbox had ~1,900 unread emails, and an unrestricted trigger
  would have processed, marked read, and uploaded attachments from all of them. Replies whose subject has no
  "Re:" are not picked up.
- To rotate the password: create a new Google app password, then edit both credentials in n8n.
