CREATE TABLE IF NOT EXISTS "kb_sources" (
  "id" serial PRIMARY KEY,
  "org_id" integer NOT NULL REFERENCES "orgs"("id"),
  "filename" text NOT NULL,
  "file_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "chunk_count" integer NOT NULL DEFAULT 0,
  "created_at" text NOT NULL DEFAULT now()::text,
  "updated_at" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS "idx_kb_sources_org" ON "kb_sources" ("org_id");

ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "source_id" integer REFERENCES "kb_sources"("id") ON DELETE CASCADE;
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "source_page" integer;

CREATE INDEX IF NOT EXISTS "idx_kb_articles_source_id" ON "kb_articles" ("source_id");
