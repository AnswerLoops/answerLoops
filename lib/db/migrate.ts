import { sql } from 'drizzle-orm'
import { getDb } from './drizzle'
import fs from 'node:fs'
import path from 'node:path'

// Postgres error codes that mean "schema object already exists".
// Safe to skip — the DB is already in the desired state.
const ALREADY_EXISTS = new Set([
  '42P07', // relation already exists (CREATE TABLE)
  '42701', // column already exists (ALTER TABLE ADD COLUMN)
  '42710', // duplicate object (constraint/index name)
  '42P16', // index already exists
  '42712', // duplicate rule
])

// Drizzle wraps postgres errors: the outer Error has no .code; the postgres
// code lives on err.cause (or err.cause.cause, etc.). Walk the chain.
function pgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as Record<string, unknown>
  if (typeof e.code === 'string') return e.code
  return pgErrorCode(e.cause)
}

// Drizzle's journal-based migrate() only applies migrations registered in
// drizzle/meta/_journal.json. Our hand-written SQL files (0002+) were never
// added to the journal so migrate() silently skips them.
//
// This custom runner reads every *.sql file in ./drizzle/ (sorted by name),
// splits on Drizzle's "--> statement-breakpoint" markers, executes each
// statement individually, and skips "already exists" errors so the runner
// is idempotent even when transitioning from the old journal-based runner
// (which applied 0000 and 0001 but left no __custom_migrations record).
export async function runMigrations() {
  const db = getDb()

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS __custom_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const migrationsDir = path.resolve(process.cwd(), 'drizzle')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = await db.execute(
    sql`SELECT filename FROM __custom_migrations`
  ) as unknown as { filename: string }[]
  const appliedSet = new Set(applied.map((r) => r.filename))

  for (const file of files) {
    if (appliedSet.has(file)) continue

    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`[migrate] applying ${file}`)

    // Split on Drizzle's statement-breakpoint markers and execute each statement
    // individually. This lets us skip "already exists" errors per-statement
    // rather than aborting the whole migration.
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt))
      } catch (err) {
        const code = pgErrorCode(err)
        if (code && ALREADY_EXISTS.has(code)) {
          // Schema already in desired state — skip silently
          continue
        }
        throw new Error(`[migrate] ${file} failed:\n${String(err)}`)
      }
    }

    await db.execute(
      sql`INSERT INTO __custom_migrations (filename) VALUES (${file})`
    )
    console.log(`[migrate] ${file} done`)
  }

  // Idempotent trigger: fires pg_notify('config_changed') whenever the
  // integrations table is written. The bot LISTENs on this channel and
  // hot-swaps its config without polling.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_config_changed()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('config_changed', '{}');
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_config_changed ON integrations;
    CREATE TRIGGER trg_config_changed
      AFTER INSERT OR UPDATE OR DELETE ON integrations
      FOR EACH ROW EXECUTE FUNCTION notify_config_changed();

    -- Per-guild channel picks (Settings → Discord, OAuth-connected servers)
    -- live in discord_guilds, not integrations — without this trigger, saving
    -- a channel selection there never notified the running bot, so the
    -- change only took effect after a manual restart. See discord-bot.mdx's
    -- Config hot-reload section, which claimed this already worked.
    DROP TRIGGER IF EXISTS trg_config_changed_discord_guilds ON discord_guilds;
    CREATE TRIGGER trg_config_changed_discord_guilds
      AFTER INSERT OR UPDATE OR DELETE ON discord_guilds
      FOR EACH ROW EXECUTE FUNCTION notify_config_changed();
  `)

  // Idempotent trigger: fires pg_notify('member_joined', org_id) on every new
  // membership INSERT. The SSE endpoint /api/events/stream LISTENs and pushes
  // the event to the owner's settings page so the team list updates in real time.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_member_joined()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_notify('member_joined', NEW.org_id::text);
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_member_joined ON memberships;
    CREATE TRIGGER trg_member_joined
      AFTER INSERT ON memberships
      FOR EACH ROW EXECUTE FUNCTION notify_member_joined();
  `)

  // Idempotent trigger: fires the same member_joined notification when an
  // invitation is accepted without inserting a new membership row — the
  // case where the accepting user is already a member of the invited org
  // (a re-clicked link, testing the flow as the org's own owner). That path
  // still needs to consume the invitation (see acceptInviteAction), and
  // without this trigger the Settings page's Pending Invites list would
  // only ever clear on the next full page load instead of live, unlike
  // every other invite-acceptance path.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_invite_accepted()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
        PERFORM pg_notify('member_joined', NEW.org_id::text);
      END IF;
      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS trg_invite_accepted ON invitations;
    CREATE TRIGGER trg_invite_accepted
      AFTER UPDATE ON invitations
      FOR EACH ROW EXECUTE FUNCTION notify_invite_accepted();
  `)
}
