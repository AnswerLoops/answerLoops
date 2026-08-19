CREATE TABLE "csat_messages" (
	"message_id" text PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csat_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"rating" smallint NOT NULL,
	"platform" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"plan_id" text DEFAULT 'hobby' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"current_period_start" text,
	"current_period_end" text,
	"cancel_at_period_end" integer DEFAULT 0 NOT NULL,
	"trial_ends_at" text,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "widget_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"widget_token" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "escalation_role_id" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "confidence_threshold" double precision DEFAULT 0.8;--> statement-breakpoint
ALTER TABLE "csat_messages" ADD CONSTRAINT "csat_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_ratings" ADD CONSTRAINT "csat_ratings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_ratings" ADD CONSTRAINT "csat_ratings_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_leads" ADD CONSTRAINT "widget_leads_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_csat_ratings_org" ON "csat_ratings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_csat_ratings_ticket" ON "csat_ratings" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_widget_leads_org" ON "widget_leads" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_widget_leads_email" ON "widget_leads" USING btree ("email");