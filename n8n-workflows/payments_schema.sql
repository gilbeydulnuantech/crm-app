-- Payments/Invoices tracking ledger. There is NO payment processor wired
-- into this CRM (no Stripe/etc.) — this is a manual record of money
-- invoiced/received/refunded, not a way to actually collect a payment.
-- `amount` is what's owed on the payment record; `amount_received` is what
-- has actually come in so far (lets partially_paid be represented for
-- real); `refunded_amount` is separate so a refund doesn't destroy the
-- history of what was originally received.
-- "Overdue" is deliberately NOT a stored status — it's derived at read
-- time from (status IN pending/processing/partially_paid AND due_date in
-- the past), same reasoning as why SLA-breach isn't a stored ticket
-- status: a static enum value goes stale the instant a clock ticks past it.
CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(30) UNIQUE NOT NULL,
    opportunity_id  INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    contact_id      INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    account_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax             NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Line items are the source of truth for amount/tax/discount/total —
    -- same jsonb-line-items convention `proposals.line_items` already
    -- uses in this app, not a separate relational table.
    line_items      JSONB NOT NULL DEFAULT '[]',
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    internal_notes  TEXT,
    customer_notes  TEXT,
    -- A voided invoice is a real, permanent override — unlike "overdue"
    -- (derived from due_date) this can't be recomputed from other columns.
    is_voided       BOOLEAN NOT NULL DEFAULT false,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id                SERIAL PRIMARY KEY,
    payment_number    VARCHAR(30) UNIQUE NOT NULL,
    invoice_id        INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    opportunity_id    INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    contact_id        INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    account_id        INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    amount            NUMERIC(12,2) NOT NULL,
    amount_received   NUMERIC(12,2) NOT NULL DEFAULT 0,
    refunded_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    method            VARCHAR(30),  -- credit_card | bank_transfer | check | cash | other
    status            VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending | processing | paid | partially_paid | failed | refunded | partially_refunded | cancelled
    reference         VARCHAR(100),
    payment_date      DATE,
    due_date          DATE,
    notes             TEXT,
    owner_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived       BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments (contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments (account_id);
CREATE INDEX IF NOT EXISTS idx_payments_opportunity ON payments (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_opportunity ON invoices (opportunity_id);

-- Payment timeline/notes reuse the app's existing generic
-- entity_activity_log table (entity_type = 'payment'), same pattern as
-- the ticketing subsystem.

-- Reusable presets, surfaced from the Documents > Templates page.
-- Invoice templates pre-fill an invoice's line_items (same shape as
-- invoices.line_items); receipt templates are the subject/body actually
-- sent by the "Send Receipt" action — same shape as email_templates minus
-- trigger_event, since receipts aren't automation-triggered.
CREATE TABLE IF NOT EXISTS invoice_templates (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    line_items  JSONB NOT NULL DEFAULT '[]',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_templates (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
