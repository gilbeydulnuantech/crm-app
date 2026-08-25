-- Appearance settings (colors, fonts, page layout, table styling, footer
-- toggles, field visibility) for the invoice template that is_active — the
-- same single-active-config convention receipt_templates already uses.
ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
