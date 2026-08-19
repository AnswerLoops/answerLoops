CREATE TABLE "ai_assessments" (
	"ticket_id" integer PRIMARY KEY NOT NULL,
	"confidence" double precision NOT NULL,
	"answered_fully" integer NOT NULL,
	"auto_deflected" integer DEFAULT 0 NOT NULL,
	"reasoning" text,
	"model" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"chat_provider" text DEFAULT 'openai' NOT NULL,
	"chat_model" text DEFAULT 'gpt-4o' NOT NULL,
	"chat_api_key" text,
	"chat_base_url" text,
	"embedding_provider" text DEFAULT 'openai' NOT NULL,
	"embedding_model" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"embedding_api_key" text,
	"embedding_base_url" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "ai_configs_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "answer_messages" (
	"discord_message_id" text PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"week_start" text NOT NULL,
	"week_end" text NOT NULL,
	"content" text NOT NULL,
	"ticket_count" integer NOT NULL,
	"generated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"installation_id" integer NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"is_private" integer DEFAULT 0 NOT NULL,
	"added_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"platform" text NOT NULL,
	"bot_token" text,
	"bot_secret" text,
	"channel_ids" text,
	"team_id" text,
	"webhook_secret" text,
	"enabled" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_bot_secret_unique" UNIQUE("bot_secret")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" integer,
	"expires_at" text NOT NULL,
	"accepted_at" text,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "kb_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"embedding" text NOT NULL,
	"model" text NOT NULL,
	"source_ticket_id" integer,
	"published" integer DEFAULT 1 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"ticket_id" integer,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"read" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"onboarded_at" text,
	"widget_token" text,
	"widget_token_expires_at" text,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "orgs_widget_token_unique" UNIQUE("widget_token")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sla_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"priority" text NOT NULL,
	"response_hours" integer NOT NULL,
	"resolve_hours" integer NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "sla_configs_priority_unique" UNIQUE("priority")
);
--> statement-breakpoint
CREATE TABLE "ticket_embeddings" (
	"ticket_id" integer PRIMARY KEY NOT NULL,
	"vector" text NOT NULL,
	"model" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"actor" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"source" text NOT NULL,
	"vote" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_links" (
	"ticket_id" integer NOT NULL,
	"related_id" integer NOT NULL,
	"score" double precision NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_links_ticket_id_related_id_pk" PRIMARY KEY("ticket_id","related_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"staff_name" text NOT NULL,
	"content" text NOT NULL,
	"discord_msg_id" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"discord_message_id" text,
	"discord_channel_id" text,
	"discord_thread_id" text,
	"discord_author_id" text,
	"discord_author_name" text,
	"content" text NOT NULL,
	"category" text,
	"severity_score" double precision,
	"ai_summary" text,
	"ai_suggested_priority" text,
	"ai_draft" text,
	"ai_draft_status" text DEFAULT 'pending' NOT NULL,
	"ai_draft_posted_at" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"sla_response_deadline" text,
	"sla_resolve_deadline" text,
	"sla_response_met" integer,
	"sla_resolve_met" integer,
	"first_response_at" text,
	"resolved_at" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_discord_message_id_unique" UNIQUE("discord_message_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"image" text,
	"provider" text,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_assessments" ADD CONSTRAINT "ai_assessments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_messages" ADD CONSTRAINT "answer_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_snapshots" ADD CONSTRAINT "faq_snapshots_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_source_ticket_id_tickets_id_fk" FOREIGN KEY ("source_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_embeddings" ADD CONSTRAINT "ticket_embeddings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_links" ADD CONSTRAINT "ticket_links_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_links" ADD CONSTRAINT "ticket_links_related_id_tickets_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_org_platform" ON "integrations" USING btree ("org_id","platform");--> statement-breakpoint
CREATE INDEX "idx_integrations_bot_secret" ON "integrations" USING btree ("bot_secret");--> statement-breakpoint
CREATE INDEX "idx_integrations_org" ON "integrations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_token" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_invitations_org" ON "invitations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_kb_articles_published" ON "kb_articles" USING btree ("published");--> statement-breakpoint
CREATE INDEX "idx_kb_articles_source" ON "kb_articles" USING btree ("source_ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_feedback_unique" ON "ticket_feedback" USING btree ("ticket_id","source","actor");--> statement-breakpoint
CREATE INDEX "idx_ticket_feedback_ticket" ON "ticket_feedback" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_links_ticket" ON "ticket_links" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tickets_priority" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tickets_category" ON "tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_tickets_ai_draft" ON "tickets" USING btree ("ai_draft_status");--> statement-breakpoint
CREATE INDEX "idx_tickets_org" ON "tickets" USING btree ("org_id");