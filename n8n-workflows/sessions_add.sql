-- Real, server-verified login sessions, replacing the old
-- token_<userId>_<timestamp> string (no signature/secret — forgeable by
-- anyone to impersonate any user id, including admins). The "Verify
-- Session" sub-workflow (called via Execute Workflow from every other
-- workflow's auth check) is the only thing that reads this table. The
-- Login workflow (user-signup-login.json) is the only thing that inserts
-- into it; logout deletes from it.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
