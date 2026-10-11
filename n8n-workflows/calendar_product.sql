-- Calendar events can be linked to a catalog product/service (picked from the Event Title dropdown).
ALTER TABLE activities ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
-- Link existing events whose title is exactly a product name.
UPDATE activities a SET product_id = p.id
FROM products p
WHERE a.product_id IS NULL AND a.due_at IS NOT NULL AND lower(btrim(a.subject)) = lower(btrim(p.name));

-- Price is saved on the event when it is booked, so later catalog price changes don't alter it.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS price NUMERIC(12,2);
UPDATE activities a SET price = p.unit_price FROM products p WHERE a.product_id = p.id AND a.price IS NULL;
