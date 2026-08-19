-- saveWidgetLead has always used ON CONFLICT DO NOTHING to dedupe lead
-- captures, but widget_leads had no unique constraint for it to conflict on —
-- the only unique column was the serial primary key, which never collides. The
-- dedupe was therefore a no-op, and /api/widget/lead is public, so the same
-- address could be inserted without limit into a customer's lead list (and
-- their CSV export).
--
-- Deduplicate before adding the index, or its creation fails on any table that
-- already collected duplicates. Keeps the earliest row per (org_id, email),
-- which is the one whose created_at the customer would recognise as when that
-- lead first came in.
DELETE FROM widget_leads a
USING widget_leads b
WHERE a.org_id = b.org_id
  AND a.email = b.email
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS widget_leads_org_email
  ON widget_leads(org_id, email);
