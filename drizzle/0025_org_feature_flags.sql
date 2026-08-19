-- Generic per-org flag store. Written only by an internal process outside
-- this app (never a self-serve customer path), read by the main app/bot for
-- manual per-contract overrides (e.g. forcing Slack polling instead of the
-- webhook default for an enterprise Slack admin who requires an
-- outbound-only integration).
CREATE TABLE IF NOT EXISTS org_feature_flags (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS org_feature_flags_org_key ON org_feature_flags(org_id, key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_org_feature_flags_org ON org_feature_flags(org_id);
