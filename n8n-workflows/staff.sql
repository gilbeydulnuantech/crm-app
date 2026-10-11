-- Staff (therapists): people who perform bookings but never sign in. Each user keeps their own list; an admin sees all.
CREATE TABLE IF NOT EXISTS staff_members (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_owner ON staff_members (owner_user_id);
-- The therapist on a calendar event (the event's "Assigned To" user stays the person who owns the booking).
ALTER TABLE activities ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff_members(id) ON DELETE SET NULL;
