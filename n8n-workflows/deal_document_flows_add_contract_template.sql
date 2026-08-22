ALTER TABLE deal_document_flows
  ADD COLUMN IF NOT EXISTS contract_template_id INT REFERENCES contract_templates(id);
