-- Track which platform (discord, slack, telegram) originated each ticket.
-- Defaults to 'discord' so all existing rows are correctly attributed.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source_platform TEXT NOT NULL DEFAULT 'discord';
