-- Automatic Deflections toggle, default OFF — see lib/db/schema.ts's
-- integrations.autoDeflectEnabled and githubRepos.autoDeflectEnabled doc
-- comments for the full explanation.
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS auto_deflect_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS auto_deflect_enabled INTEGER NOT NULL DEFAULT 0;
