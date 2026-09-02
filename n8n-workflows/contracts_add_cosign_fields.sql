-- Supports the owner/assigned-rep countersignature flow: once a contract
-- template has a dedicated "Owner Signature" field, the assigned rep (or an
-- admin) can add their own signature after the client signs, before the
-- contract can be sent/downloaded as a final PDF.
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cosign_signature_data text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cosigned_by int REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cosigned_at timestamptz;
