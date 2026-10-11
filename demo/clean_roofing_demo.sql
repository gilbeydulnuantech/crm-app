-- Removes everything demo/seed_roofing_demo.sql created, restores the real company
-- profile, and drops the registry. Safe to run once; errors if no demo is loaded.
--
--   psql -d n8n_vectordb -1 -f demo/clean_roofing_demo.sql
--
-- Anything YOU created while recording (e.g. a live booking made during the demo)
-- is not in the registry — delete those records in the CRM yourself.

DO $$
BEGIN
  IF to_regclass('public.demo_seed_registry') IS NULL THEN
    RAISE EXCEPTION 'No demo data is loaded (demo_seed_registry not found).';
  END IF;
END $$;

-- rows that point at demo contacts/deals but were created by the app or the engines afterwards
DELETE FROM automation_runs WHERE (entity_type = 'pipeline' AND entity_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'opportunities'));
DELETE FROM entity_activity_log WHERE (entity_type = 'contact' AND entity_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'contacts'))
   OR (entity_type = 'opportunity' AND entity_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'opportunities'));
DELETE FROM email_sends WHERE contact_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'contacts');

DELETE FROM payments        WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'payments');
DELETE FROM payments        WHERE invoice_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'invoices');
DELETE FROM invoices        WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'invoices');
DELETE FROM deal_won_actions WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'deal_won_actions');
DELETE FROM taggables       WHERE entity_type = 'contact' AND entity_id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'contacts');
DELETE FROM notes           WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'notes');
DELETE FROM activities      WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'activities');
DELETE FROM opportunities   WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'opportunities');
DELETE FROM contacts        WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'contacts');
DELETE FROM companies       WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'companies');
DELETE FROM tags            WHERE id IN (SELECT row_id FROM demo_seed_registry WHERE table_name = 'tags')
                             AND NOT EXISTS (SELECT 1 FROM taggables t WHERE t.tag_id = tags.id);

-- restore the real company profile
UPDATE company_profile cp SET
  company_name = b.company_name, email = b.email, phone = b.phone, address = b.address, website = b.website,
  logo_url = b.logo_url, brand_color = b.brand_color, timezone = b.timezone, updated_at = b.updated_at, updated_by = b.updated_by
FROM demo_company_profile_backup b WHERE cp.id = b.id;

DROP TABLE demo_company_profile_backup;
DROP TABLE demo_seed_registry;
