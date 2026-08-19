-- Removes the platform-hosted zero-setup email inbound address —
-- inbox.answerloops.app was never actually provisioned (no DNS zone,
-- NXDOMAIN), so every message sent to a generated address bounced. See
-- lib/db/schema.ts's integrations table (inboundAddress column removed).
-- BYO-provider inbound email (X-Email-Webhook-Secret) is unaffected.
DROP INDEX IF EXISTS integrations_inbound_address_unique;
--> statement-breakpoint
ALTER TABLE integrations DROP COLUMN IF EXISTS inbound_address;
