ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS win_score INT,
  ADD COLUMN IF NOT EXISTS win_score_reason TEXT;
