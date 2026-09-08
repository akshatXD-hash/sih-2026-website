CREATE TABLE branch_scheme_support (
  id SERIAL PRIMARY KEY,
  scheme_id TEXT NOT NULL REFERENCES loan_schemes(id) ON DELETE RESTRICT,
  bank_id TEXT REFERENCES bank_directory(id) ON DELETE RESTRICT,
  partner_id TEXT REFERENCES channel_partners(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('SUPPORTED', 'NOT_SUPPORTED', 'UNKNOWN')),
  evidence_url TEXT NOT NULL,
  notes TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((bank_id IS NOT NULL)::int + (partner_id IS NOT NULL)::int = 1),
  CHECK (expires_at > verified_at)
);
CREATE INDEX branch_scheme_bank_idx ON branch_scheme_support(scheme_id, bank_id, id DESC);
CREATE INDEX branch_scheme_partner_idx ON branch_scheme_support(scheme_id, partner_id, id DESC);
CREATE INDEX bank_directory_name_idx ON bank_directory(LOWER(name) text_pattern_ops);
CREATE INDEX bank_directory_pincode_idx ON bank_directory(pincode);
