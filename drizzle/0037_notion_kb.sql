-- Notion workspace as a knowledge-base source (Market Expansion Phase 2).
--
-- Unlike GitHub — where the App private key mints a short-lived installation
-- token on demand and nothing is persisted — Notion internal integration
-- tokens are long-lived and pasted by the customer, so the token has to be
-- stored. It is encrypted at rest (lib/crypto/tokens.ts, AES-256-GCM) exactly
-- like integrations.bot_token; ENCRYPTION_KEY must be set before a customer
-- connects Notion in any real environment.
--
-- One row per org (org_id UNIQUE). kb_source_id is bookkeeping only — the
-- actual KB content lives in kb_sources/kb_articles under file_type = 'notion'.
CREATE TABLE IF NOT EXISTS notion_connections (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL UNIQUE REFERENCES orgs(id),
  access_token TEXT NOT NULL,
  workspace_name TEXT,
  kb_source_id INTEGER,
  kb_last_synced TEXT,
  kb_chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_notion_connections_org ON notion_connections(org_id);
--> statement-breakpoint
-- Every KB source has been implicitly published (searchable + served to the
-- website widget) since kb_articles.published shipped. The default 1 keeps
-- that true for every existing source and every non-Notion importer. Notion
-- is the one source that imports unpublished — its chunks stay out of the
-- widget and the AI's answer context until the customer clicks Publish.
ALTER TABLE kb_sources ADD COLUMN IF NOT EXISTS published INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_kb_sources_published ON kb_sources(published);
