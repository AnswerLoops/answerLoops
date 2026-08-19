-- Add connected_guild_id to integrations so a Discord server can be
-- linked to an org via the one-click OAuth invite flow instead of
-- requiring users to manually enter a bot token.
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS connected_guild_id TEXT;
CREATE INDEX IF NOT EXISTS idx_integrations_guild ON integrations(connected_guild_id);
