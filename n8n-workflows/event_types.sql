-- Editable calendar event types. activities.type keeps storing the type's `key`, so every existing event and
-- every workflow that filters on a.type = 'meeting' keeps working; renaming a type only changes its label.
CREATE TABLE IF NOT EXISTS event_types (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748B',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,  -- can be renamed/recolored but not deleted (workflows rely on it)
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_types_name_lower ON event_types (lower(name));
-- A service (product) belongs to a type; picking the service in a new event fills the event's type from it.
ALTER TABLE products ADD COLUMN IF NOT EXISTS event_type_id INTEGER REFERENCES event_types(id) ON DELETE SET NULL;
