-- Stripe webhook idempotency + ordering guard. Stripe doesn't guarantee
-- exactly-once or in-order delivery — a retry can reprocess an event we've
-- already applied, and (rarer, but real) an out-of-order delivery can apply
-- a stale event after a newer one, e.g. a delayed 'active' status update
-- landing after a subscription was already canceled, resurrecting access.
--
-- webhook_events dedupes by Stripe's event.id. last_event_created on
-- subscriptions lets the handler compare an incoming event's timestamp
-- against the last one actually applied to that row, and skip anything
-- older.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_event_created INTEGER;
