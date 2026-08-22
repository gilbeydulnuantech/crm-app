-- Records the signer's IP address at the moment a contract is signed, as an
-- audit trail. Never exposed on the public contract page — only surfaced to
-- admins in the internal Contracts list.
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_ip text;
