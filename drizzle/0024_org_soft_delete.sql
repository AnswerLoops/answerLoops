-- Soft-delete flag for org self-service account deletion. NULL means
-- active — the pre-existing behaviour for every current row, so adding
-- this column changes nothing until an owner deletes their account.
--
-- A background sweep hard-purges orgs whose deleted_at is older than the
-- grace period (see lib/db/queries/orgs.ts: getOrgsPendingPurge /
-- hardPurgeOrg), so this is a temporary marker, not the deletion itself.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
