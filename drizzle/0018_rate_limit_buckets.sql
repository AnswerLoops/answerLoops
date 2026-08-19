-- Shared rate-limit buckets: lib/ratelimit.ts's in-process Map-backed
-- limiter only sees traffic hitting one instance, so the effective MCP
-- limit becomes (60 or 300) * instance count on any horizontally-scaled
-- or serverless deploy, and resets on every restart/redeploy (#169). This
-- table backs a Postgres-atomic-upsert limiter (rateLimitShared) so every
-- instance enforces the same window against the same counter.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);
