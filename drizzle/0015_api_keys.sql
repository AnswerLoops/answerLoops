-- Agent/MCP API keys: org-scoped Bearer tokens for the MCP server and
-- future agent-facing endpoints. Only a SHA-256 hash is stored.

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  last_used_at TEXT,
  expires_at TEXT,
  revoked_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (org_id);
