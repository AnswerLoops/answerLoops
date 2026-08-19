-- Multi-server Discord support: an org can connect more than one Discord
-- server. integrations.connected_guild_id capped every org at exactly one
-- guild (unique on org_id+platform). This child table replaces it for the
-- OAuth-connected path, one row per connected server, unique on guild_id
-- only (a server can't belong to two orgs at once).

CREATE TABLE IF NOT EXISTS discord_guilds (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  guild_id TEXT NOT NULL,
  guild_name TEXT,
  channel_ids TEXT,
  escalation_role_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (now())::text,
  updated_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS discord_guilds_guild_unique ON discord_guilds (guild_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_discord_guilds_org ON discord_guilds (org_id);
--> statement-breakpoint
-- Backfill: every org with an existing single OAuth-connected guild gets a
-- row here so it keeps working post-migration with zero user action.
INSERT INTO discord_guilds (org_id, guild_id, channel_ids, escalation_role_id, enabled)
SELECT org_id, connected_guild_id, channel_ids, escalation_role_id, enabled
FROM integrations
WHERE platform = 'discord' AND connected_guild_id IS NOT NULL
ON CONFLICT (guild_id) DO NOTHING;
