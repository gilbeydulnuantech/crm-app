-- Support ticketing subsystem: tickets + threaded comments.
-- priority drives sla_due_at at creation time (see Tickets.json's
-- "Check Payload: create-ticket" node): urgent=4h, high=8h, normal=24h,
-- low=72h from created_at.
CREATE TABLE IF NOT EXISTS tickets (
    id              SERIAL PRIMARY KEY,
    subject         VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'open',   -- open | pending | resolved | closed
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
    contact_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    account_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    assigned_user   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sla_due_at      TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Raw submitter identity from the public intake form (create-ticket-public,
    -- no session token) — kept even when contact_id resolves to a match, so a
    -- ticket never loses who actually submitted it.
    submitter_name  TEXT,
    submitter_email TEXT,
    category        TEXT,       -- Technical | Billing | General | Feature Request | Bug | Other
    resolution_notes TEXT,
    resolved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_contact ON tickets (contact_id);
CREATE INDEX IF NOT EXISTS idx_tickets_account ON tickets (account_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets (assigned_user);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id          SERIAL PRIMARY KEY,
    ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    body        TEXT NOT NULL,
    channel     VARCHAR(20) NOT NULL DEFAULT 'internal', -- internal | email (email also sends a real message to the customer)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The activity timeline reuses the app's existing generic entity_activity_log
-- table (entity_type = 'ticket') for structured events — created, status
-- changes, assignment changes, priority changes, resolved — merged with
-- ticket_comments (customer/internal messages) at read time in get-ticket.

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id);
