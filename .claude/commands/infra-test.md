# Infra-Test — automated test generation for infrastructure changes

Invoke with `/project:infra-test` on any branch that contains an infrastructure change.

The orchestrator (main Claude) deploys a subagent to write tests, then reviews and signs off.

---

## What counts as an infrastructure change

- New or replaced background jobs, listeners, queues, polling loops
- New DB migrations, triggers, or schema changes
- New or changed API routes (bot ↔ app, widget ↔ app, external webhooks)
- New Docker stages, compose services, or environment variables
- New or changed external service integrations (Discord, Slack, AI, Stripe, etc.)
- Changes to `lib/db/migrate.ts`, `lib/db/drizzle.ts`, or `lib/db/schema.ts`

---

## Orchestrator steps

### Step 1 — audit the diff

```bash
git diff main...HEAD --stat
git diff main...HEAD -- 'lib/db/**' 'bot/**' 'app/api/**' 'docker-compose*' 'Dockerfile'
```

Identify every infrastructure file that changed. List them.

### Step 2 — deploy subagent to write tests

Spawn an Agent with subagent_type "claude" (or "general-purpose") with this prompt:

> You are writing infrastructure tests for the following changed files: [list files].
> 
> Rules:
> - Tests use vitest. Place unit/infra tests in `tests/unit/`, e2e specs in `e2e/`.
> - Each test must be runnable without a live DB or Docker daemon (use file-system assertions, import checks, or mocked connections).
> - For DB migrations/triggers: assert the SQL file exists, is non-empty, and contains the expected CREATE statements.
> - For bot changes: assert the relevant function is exported and has the correct signature.
> - For new env vars: assert the variable is referenced in the correct config file.
> - For compose/Dockerfile changes: assert the relevant service, stage, or env var is present in the file.
> - Do not duplicate tests that already exist. Read `tests/unit/` and `e2e/` first.
> - Return: list of files written + a summary of what each test covers.

### Step 3 — orchestrator review

After the subagent completes, the orchestrator (main Claude) must:

1. Read each new test file
2. Run `pnpm test` — verify all new tests pass
3. Check: do the tests actually cover the infrastructure change? Would they catch a regression?
4. If any test is weak or missing coverage → send back to subagent with specific instructions

### Step 4 — update the PR

Add a "Tests added by infra-test" section to the PR body listing each new test file and what it covers.

### Step 5 — commit

```bash
git add tests/ e2e/
git commit -m "test: add infra tests for <change summary>

Tests cover: <list what each test catches>
Written by /project:infra-test subagent, reviewed and signed off by orchestrator."
git push
```

### Step 6 — orchestrator sign-off

Output a sign-off block:

```
INFRA-TEST SIGN-OFF
===================
Branch: <branch>
Changed infra files: <list>
Tests written: <list file paths>
pnpm test: PASS (<N> tests, <N> new)
Coverage gaps: none / <list any known gaps>
Orchestrator verdict: APPROVED ✅ / NEEDS REVISION ❌
```

If verdict is NEEDS REVISION, loop back to Step 2 with the specific gaps listed.
