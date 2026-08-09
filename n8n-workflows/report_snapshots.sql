-- ============================================================
-- REPORT SNAPSHOTS
-- Not in the original enterprise-crm-schema.sql — added to give
-- Reports trend charts a stable history independent of live data changes.
--
-- If you already created this table yourself, double check it matches this
-- shape exactly — reports-crud.json and report-snapshot-scheduler.json both
-- assume these exact column names and the UNIQUE constraint below (the
-- scheduler's ON CONFLICT clause depends on it).
-- ============================================================
CREATE TABLE IF NOT EXISTS report_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_date   DATE NOT NULL,
    metric          VARCHAR(100) NOT NULL,   -- 'total_revenue' | 'new_contacts' | 'activity_volume' (extensible)
    scope           VARCHAR(50) DEFAULT 'company',  -- 'company' for org-wide, or a user_id as text for per-rep metrics later
    value           NUMERIC(14,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (snapshot_date, metric, scope)
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_metric_date ON report_snapshots (metric, scope, snapshot_date);
