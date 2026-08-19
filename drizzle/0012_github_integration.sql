ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS monitored_events TEXT NOT NULL DEFAULT 'both';
--> statement-breakpoint
ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS kb_enabled INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS kb_last_synced TEXT;
--> statement-breakpoint
ALTER TABLE github_repos ADD COLUMN IF NOT EXISTS kb_chunk_count INTEGER NOT NULL DEFAULT 0;
