-- Gmail/Outlook OAuth send-only connections (Phase 2/3 of the email
-- integration redesign) — see lib/db/schema.ts's emailOauthConnections doc comment.
CREATE TABLE IF NOT EXISTS email_oauth_connections (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL UNIQUE REFERENCES orgs(id),
  provider TEXT NOT NULL,
  mailbox_address TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TEXT,
  refresh_token TEXT NOT NULL,
  granted_scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  disconnected_at TEXT,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_email_oauth_connections_org ON email_oauth_connections(org_id);
