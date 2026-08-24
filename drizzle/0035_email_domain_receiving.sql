ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS receiving_record_name TEXT;
--> statement-breakpoint
ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS receiving_record_value TEXT;
--> statement-breakpoint
ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS receiving_record_priority INTEGER;
