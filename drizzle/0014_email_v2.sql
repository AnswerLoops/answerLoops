-- Email channel v2: platform-hosted inbound address + email message spine
-- (idempotency, conversation threading, delivery-status tracking).

ALTER TABLE integrations ADD COLUMN IF NOT EXISTS inbound_address TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS integrations_inbound_address_unique
  ON integrations (inbound_address);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS email_messages (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  direction TEXT NOT NULL,
  rfc_message_id TEXT NOT NULL UNIQUE,
  provider_message_id TEXT UNIQUE,
  in_reply_to TEXT,
  "references" TEXT,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  from_addr TEXT,
  to_addr TEXT,
  subject TEXT,
  spam_verdict TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  raw_payload JSONB,
  created_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages (org_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_email_messages_ticket ON email_messages (ticket_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_email_messages_in_reply_to ON email_messages (in_reply_to);
