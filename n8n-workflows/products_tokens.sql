-- Products catalog + {{product_<slug>}} merge tokens.
-- Run once on the CRM database (idempotent).
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description_html text NOT NULL DEFAULT '',
  sku text,
  category text,
  unit text NOT NULL DEFAULT 'each',
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_name_idx ON products (lower(name));

ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;

-- "Metal Roof (per sq)" -> "metal_roof_per_sq"
CREATE OR REPLACE FUNCTION product_slug(n text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(NULLIF(trim(both '_' from regexp_replace(lower(coalesce(n, '')), '[^a-z0-9]+', '_', 'g')), ''), 'product')
$$;

UPDATE products SET slug = product_slug(name) || CASE WHEN id = (SELECT min(p2.id) FROM products p2 WHERE product_slug(p2.name) = product_slug(products.name)) THEN '' ELSE '_' || id END
WHERE slug IS NULL;
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products (slug);

-- Replaces every {{product_<slug>}} in a document with that product's description
-- with its price on the same line (the name is not included). as_text => plain text (for emails/SMS), otherwise HTML.
-- json_escape => the replacement is JSON-string-escaped, for text that is a serialised JSON document.
-- Unknown or inactive slugs are left in place so a typo is visible, not silent.
DROP FUNCTION IF EXISTS resolve_product_tokens(text, boolean);
CREATE OR REPLACE FUNCTION resolve_product_tokens(t text, as_text boolean DEFAULT false, json_escape boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE
  out text := t;
  m text;
  p record;
  rep text;
  plain text;
  price text;
  desc_html text;
BEGIN
  IF t IS NULL OR position('{{' in t) = 0 THEN RETURN t; END IF;
  FOR m IN SELECT DISTINCT (regexp_matches(t, '\{\{\s*product_([a-z0-9_]+)\s*\}\}', 'gi'))[1] LOOP
    SELECT name, description_html, unit_price, unit INTO p FROM products WHERE slug = lower(m) AND is_active;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF as_text THEN
      plain := btrim(regexp_replace(regexp_replace(regexp_replace(coalesce(p.description_html, ''), '</(p|div|li)>|<br\s*/?>', E'\n', 'gi'), '<[^>]*>', '', 'g'), E'\n{2,}', E'\n', 'g'), E' \n\r\t');
      rep := CASE WHEN plain <> '' THEN plain || ' - ' ELSE '' END || '$' || to_char(p.unit_price, 'FM999,999,999,990.00') || ' / ' || p.unit;
    ELSE
      price := '<strong>$' || to_char(p.unit_price, 'FM999,999,999,990.00') || ' / ' || replace(replace(replace(p.unit, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</strong>';
      -- Inline only: the token already sits inside the author's own paragraph, so the description's <p> wrappers
      -- are dropped (paragraph breaks become <br>); otherwise nested <p> tags add large gaps between products.
      desc_html := btrim(regexp_replace(regexp_replace(coalesce(p.description_html, ''), '</p>\s*<p[^>]*>', '<br>', 'gi'), '</?p[^>]*>', '', 'gi'), E' \n\r\t');
      IF desc_html = '' THEN
        rep := price;
      ELSE
        rep := desc_html || ' &mdash; ' || price;
      END IF;
    END IF;
    IF json_escape THEN rep := substr(to_jsonb(rep)::text, 2, length(to_jsonb(rep)::text) - 2); END IF;
    -- regexp_replace treats \ and & in the replacement specially; park them as control chars and restore after
    out := replace(replace(regexp_replace(out, '\{\{\s*product_' || m || '\s*\}\}', replace(replace(rep, '\', chr(2)), '&', chr(1)), 'gi'), chr(1), '&'), chr(2), '\');
  END LOOP;
  RETURN out;
END $$;
