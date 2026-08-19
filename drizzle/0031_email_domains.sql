-- Verified custom-domain sending for email (Phase 1 of the email
-- integration redesign) — see lib/db/schema.ts's emailDomains table and
-- integrations.emailSendMethod doc comments.
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS email_send_method TEXT NOT NULL DEFAULT 'platform';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS email_domains (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL UNIQUE REFERENCES orgs(id),
  domain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_domain_id TEXT,
  dkim_record_name TEXT,
  dkim_record_value TEXT,
  return_path_record_name TEXT,
  return_path_record_value TEXT,
  dmarc_suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_checked_at TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_email_domains_org ON email_domains(org_id);
