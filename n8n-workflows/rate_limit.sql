-- Shared rate limiter for the public (no-login) endpoints. rate_limit_ok() records a hit and returns
-- false once a bucket+key has used up its allowance inside the window.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup ON rate_limit_hits (bucket, key, created_at);
CREATE OR REPLACE FUNCTION rate_limit_ok(p_bucket text, p_key text, p_max int, p_window interval) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE hits int;
BEGIN
  IF random() < 0.02 THEN DELETE FROM rate_limit_hits WHERE created_at < now() - interval '2 days'; END IF;
  SELECT count(*) INTO hits FROM rate_limit_hits WHERE bucket = p_bucket AND key = p_key AND created_at > now() - p_window;
  IF hits >= p_max THEN RETURN false; END IF;
  INSERT INTO rate_limit_hits (bucket, key) VALUES (p_bucket, p_key);
  RETURN true;
END $$;
