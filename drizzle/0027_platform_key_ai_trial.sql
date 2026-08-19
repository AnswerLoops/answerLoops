ALTER TABLE orgs ADD COLUMN IF NOT EXISTS platform_key_trial_used integer NOT NULL DEFAULT 0;
