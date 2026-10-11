-- Branch / location name shown next to each user (Settings > User management).
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
