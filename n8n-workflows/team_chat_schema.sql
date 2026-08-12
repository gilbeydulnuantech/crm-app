-- Team Chat schema. Run this once against the app's Postgres database before
-- importing TeamChat.json (n8n doesn't run DDL itself — same convention as
-- the lost_reason/notes columns added elsewhere in this repo).

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('dm', 'channel', 'context')),
  name VARCHAR(100),                 -- channel display name (e.g. "Sales"); null for dm/context

  -- DM identity: 'lower_user_id-higher_user_id', e.g. '3-7'. A unique index
  -- on this stops two users from ever getting two separate DM threads.
  dm_key VARCHAR(50),

  -- Contextual identity (phase 2) — mirrors the notes/taggables tables'
  -- entity_type/entity_id polymorphic pattern already used elsewhere in
  -- this app, rather than a separate nullable FK per record type.
  entity_type VARCHAR(20),
  entity_id INTEGER,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_dm_key ON conversations (dm_key) WHERE type = 'dm';
CREATE INDEX IF NOT EXISTS idx_conversations_entity ON conversations (entity_type, entity_id) WHERE type = 'context';

-- Who's in a conversation, and how far they've read it. last_read_at (not a
-- per-message is_read flag) is what makes unread counts correct for
-- channels with 3+ members, not just 1:1 DMs.
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- Seed the 4 team-wide channels from the mockup, with every currently
-- active user auto-joined. New users won't auto-join channels created
-- before they existed — that's a follow-up (a "join default channels" step
-- on user creation), not handled here.
INSERT INTO conversations (type, name)
SELECT 'channel', name FROM (VALUES ('General'), ('Sales'), ('Operations'), ('Management')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM conversations c WHERE c.type = 'channel' AND c.name = v.name);

INSERT INTO conversation_members (conversation_id, user_id)
SELECT c.id, u.id
FROM conversations c
CROSS JOIN users u
WHERE c.type = 'channel' AND u.active = true
ON CONFLICT DO NOTHING;
