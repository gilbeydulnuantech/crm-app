ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS thank_you_page_id INT REFERENCES pages(id);

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS thank_you_page_id INT REFERENCES pages(id);
