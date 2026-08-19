-- tickets.id is a global serial shared across every org — correct for FKs,
-- wrong to show a customer (org 12's 3rd-ever ticket showing as "#847"
-- leaks how many tickets every other org on the platform has created).
-- Adds a per-org ticket number, backfills every existing row, then seeds
-- each org's counter so new tickets continue the sequence rather than
-- restarting at 1 and colliding with backfilled numbers.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS next_ticket_number integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS org_ticket_number integer;
--> statement-breakpoint
UPDATE tickets t SET org_ticket_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY id) AS rn
  FROM tickets
) sub
WHERE t.id = sub.id AND t.org_ticket_number IS NULL;
--> statement-breakpoint
UPDATE orgs o SET next_ticket_number = COALESCE(
  (SELECT MAX(org_ticket_number) + 1 FROM tickets WHERE org_id = o.id), 1
)
WHERE EXISTS (SELECT 1 FROM tickets WHERE org_id = o.id);
--> statement-breakpoint
ALTER TABLE tickets ALTER COLUMN org_ticket_number SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tickets_org_ticket_number_unique ON tickets(org_id, org_ticket_number);
