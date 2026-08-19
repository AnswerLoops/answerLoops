-- Attribute generate_answer usage to the API key that drove it, not just the
-- org. An org can hold up to 25 active keys across different clients; without
-- this column a suspected key leak forces revoking every key blind.
--
-- Nullable by design: rows written before this migration have no key, and a
-- key row can be removed without destroying the historical usage record.
ALTER TABLE api_generations ADD COLUMN IF NOT EXISTS key_id integer REFERENCES api_keys(id);

CREATE INDEX IF NOT EXISTS idx_api_generations_key ON api_generations(key_id);
