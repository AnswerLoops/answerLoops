ALTER TABLE tickets RENAME COLUMN discord_message_id TO source_message_id;
--> statement-breakpoint
ALTER TABLE tickets RENAME COLUMN discord_thread_id TO source_thread_id;
--> statement-breakpoint
ALTER TABLE tickets RENAME COLUMN discord_channel_id TO source_channel_id;
--> statement-breakpoint
ALTER TABLE tickets RENAME COLUMN discord_author_id TO source_author_id;
--> statement-breakpoint
ALTER TABLE tickets RENAME COLUMN discord_author_name TO source_author_name;
