ALTER TABLE proposal_templates
  ADD COLUMN IF NOT EXISTS linked_contract_template_id INT REFERENCES contract_templates(id);

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS linked_contract_template_id INT REFERENCES contract_templates(id);
