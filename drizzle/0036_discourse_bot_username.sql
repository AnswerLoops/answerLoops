-- Discourse channel: the forum account the bot posts replies as. Sent as the
-- Api-Username header on every write to the Discourse API. Kept separate from
-- escalation_role_id (the human tagged on low-confidence answers) so neither
-- column has to do double duty.
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS bot_username TEXT;
