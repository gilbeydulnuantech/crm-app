-- ============================================================
-- WARNING: This drops all existing CRM tables and data.
-- Back up first if you want to keep anything:
--   pg_dump -t contacts -t companies -t users -t opportunities \
--           -t activities -t tags -t taggables -t stages -t pipelines \
--           your_db > crm_backup.sql
-- ============================================================

DROP TABLE IF EXISTS taggables CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
    active          BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMPANIES (Accounts)
-- ============================================================
CREATE TABLE companies (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    website         VARCHAR(255),
    industry        VARCHAR(100),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    phone           VARCHAR(50),
    owner_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_owner ON companies (owner_id);
CREATE INDEX idx_companies_name ON companies (name);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
    id                  SERIAL PRIMARY KEY,
    first_name          VARCHAR(150) NOT NULL,
    last_name           VARCHAR(150),
    job_title           VARCHAR(150),
    account_id          INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    email               VARCHAR(255),
    secondary_email     VARCHAR(255),
    phone               VARCHAR(50),
    secondary_phone     VARCHAR(50),
    linkedin_url        VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    zip_code            VARCHAR(20),
    country             VARCHAR(100),
    lead_status         VARCHAR(50) DEFAULT 'New',   -- New | Contacted | Qualified | Unqualified
    lead_source         VARCHAR(100),
    do_not_contact      BOOLEAN NOT NULL DEFAULT false,
    owner_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_archived         BOOLEAN NOT NULL DEFAULT false,
    last_contacted_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_owner ON contacts (owner_id);
CREATE INDEX idx_contacts_account ON contacts (account_id);
CREATE INDEX idx_contacts_archived ON contacts (is_archived);
CREATE INDEX idx_contacts_email ON contacts (email);

-- ============================================================
-- PIPELINES & STAGES
-- ============================================================
CREATE TABLE pipelines (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stages (
    id              SERIAL PRIMARY KEY,
    pipeline_id     INTEGER REFERENCES pipelines(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    display_order   INTEGER NOT NULL DEFAULT 0,
    win_probability INTEGER DEFAULT 0,   -- 0-100, default probability for this stage
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stages_pipeline ON stages (pipeline_id);

-- ============================================================
-- OPPORTUNITIES (Deals)
-- ============================================================
CREATE TABLE opportunities (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    contact_id      INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    account_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    pipeline_id     INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
    stage_id        INTEGER REFERENCES stages(id) ON DELETE SET NULL,
    assigned_user    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deal_value      NUMERIC(12,2),
    probability     INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'Open',   -- Open | Won | Lost
    expected_close  DATE,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opportunities_contact ON opportunities (contact_id);
CREATE INDEX idx_opportunities_stage ON opportunities (stage_id);
CREATE INDEX idx_opportunities_assigned ON opportunities (assigned_user);

-- ============================================================
-- ACTIVITIES (calls, emails, tasks, notes, meetings)
-- ============================================================
CREATE TABLE activities (
    id              SERIAL PRIMARY KEY,
    contact_id      INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    opportunity_id  INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type            VARCHAR(50) NOT NULL,   -- 'call' | 'email' | 'task' | 'note' | 'meeting'
    subject         VARCHAR(255),
    body            TEXT,
    is_completed    BOOLEAN DEFAULT false,
    due_at          TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_contact ON activities (contact_id);
CREATE INDEX idx_activities_opportunity ON activities (opportunity_id);

-- ============================================================
-- TAGS (free-text, reusable across entity types)
-- ============================================================
CREATE TABLE tags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    color       VARCHAR(20)
);

CREATE TABLE taggables (
    id              SERIAL PRIMARY KEY,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL,   -- 'contact' | 'company' | 'opportunity'
    entity_id       INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_taggables_entity ON taggables (entity_type, entity_id);

-- ============================================================
-- Seed a default pipeline + stages so the app has something to show
-- ============================================================
INSERT INTO pipelines (name, is_default) VALUES ('Sales Pipeline', true);

INSERT INTO stages (pipeline_id, name, display_order, win_probability) VALUES
  (1, 'Prospecting', 1, 10),
  (1, 'Qualified', 2, 25),
  (1, 'Proposal', 3, 50),
  (1, 'Negotiation', 4, 75),
  (1, 'Closed Won', 5, 100),
  (1, 'Closed Lost', 6, 0);
