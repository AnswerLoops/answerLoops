CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "created_at" text NOT NULL DEFAULT now()
);
