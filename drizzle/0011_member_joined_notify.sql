-- Fires pg_notify('member_joined', org_id::text) on every new membership row.
-- The SSE endpoint /api/events/stream listens and pushes the event to connected clients.
CREATE OR REPLACE FUNCTION notify_member_joined()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('member_joined', NEW.org_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_joined ON memberships;
CREATE TRIGGER trg_member_joined
  AFTER INSERT ON memberships
  FOR EACH ROW EXECUTE FUNCTION notify_member_joined();
