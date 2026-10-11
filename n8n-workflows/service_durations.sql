-- A service can offer several lengths, each with its own price: [{"minutes": 30, "price": 15}, {"minutes": 60, "price": 25}].
-- Empty = a single-length service that uses unit_price and the default slot length (the old behaviour).
ALTER TABLE products ADD COLUMN IF NOT EXISTS durations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_durations_check;
ALTER TABLE products ADD CONSTRAINT products_durations_check CHECK (jsonb_typeof(durations) = 'array');
