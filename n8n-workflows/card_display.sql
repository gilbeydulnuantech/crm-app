-- Per-person display choices for calendar event cards and deal cards (Settings > Card display).
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_display JSONB;
