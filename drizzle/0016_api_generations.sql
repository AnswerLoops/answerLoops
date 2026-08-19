-- Tracks generate_answer MCP calls for billing purposes. That tool never
-- creates a ticket/ai_assessments row like every other channel does, so
-- without this table, monthly deflection usage would never reflect
-- API-originated LLM spend. Only high-confidence generations count against
-- the plan limit (getMonthlyDeflections), mirroring ai_assessments.auto_deflected.

CREATE TABLE IF NOT EXISTS api_generations (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  high_confidence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now())::text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_api_generations_org ON api_generations (org_id);
