# Component-Test — automated test generation for UI component changes

Invoke with `/project:component-test` on any branch that adds or meaningfully changes a component with real logic (state, effects, event handlers, conditional rendering) — not on pure Tailwind/markup-only edits. This is the **diff mode** (default) — see "Full audit mode" below for scanning the whole repo instead of just the current diff.

The orchestrator (main Claude) deploys a subagent to write component tests, then reviews and signs off. This mirrors `/project:infra-test` (infrastructure changes) and complements `/project:mobile-check` (responsive audits, which never writes tests).

---

## What counts as a component change needing tests

- New or meaningfully-changed files under `components/**/*.tsx` that contain `useState`, `useEffect`, `useActionState`, event handlers, or conditional rendering branches
- New shared/reusable primitives under `components/ui/**` — these get reused everywhere, so a regression has wide blast radius
- Changes to existing component tests' subject files that alter behavior, not just styling

**Skip this skill** for markup-only changes (adding a Tailwind class, changing text copy, adjusting spacing) — that's `/project:mobile-check` territory, not this one. If a diff only touches `className` strings and no logic, don't invoke.

---

## Why this exists

The repo's existing test suite (`tests/unit/**/*.test.ts`, added in PR #34) covers pure logic in `lib/` only. Neither `/project:infra-test` (scoped to DB/bot/API/Docker) nor `/project:mobile-check` (audits and fixes responsiveness, never generates tests) covers component behavior. `components/ui/mobile-drawer.tsx` shipped in PR #113 with real stateful logic and zero coverage until a follow-up commit closed the gap — this skill exists so that doesn't happen silently again.

---

## Orchestrator steps

### Step 1 — audit the diff

```bash
git diff main...HEAD --stat -- 'components/**/*.tsx'
```

For each changed file, check whether it has logic worth testing (see "What counts" above) versus markup-only changes. List the files that qualify.

### Step 2 — verify test infra exists

```bash
grep -q "@testing-library/react" package.json && echo "present" || echo "missing"
```

If missing, the subagent in Step 3 must also install `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `happy-dom` as dev dependencies (not `jsdom` — it pulled a mismatched `undici` peer in this repo and crashed the vitest worker pool; `happy-dom` doesn't have that problem), and wire `tests/unit/setup-dom.ts` (jest-dom matchers + explicit `afterEach(cleanup)`, since this repo doesn't set vitest's `globals: true`) into `vitest.config.ts`'s `setupFiles`. Reference the setup added in `feat/mobile-responsive-dashboard` if it's already merged.

### Step 3 — deploy subagent to write tests

Spawn an Agent with subagent_type "claude" (or "general-purpose") with this prompt:

> You are writing component tests for the following changed files: [list files].
>
> Rules:
> - Tests use vitest + `@testing-library/react` + `@testing-library/user-event`. Place them in `tests/unit/<component-name>.test.tsx`.
> - Add `// @vitest-environment happy-dom` as the first line of any new test file (this repo's default vitest environment is `node`; only opt into a DOM environment per-file).
> - Test behavior, not implementation: what renders when, what happens on click/change/submit, what's absent until a condition is met. Don't assert on internal state or class names unless the class name IS the behavior under test (e.g. asserting a custom `className` prop is applied).
> - For any component with a portal, conditional overlay, or anything that could be confined by an ancestor's `transform`/`filter`/`backdrop-filter` establishing a CSS containing block: assert the portaled content lands in `document.body` and not inside the component's own render tree.
> - Mock `fetch` calls with `vi.fn()` rather than hitting real API routes.
> - Do not duplicate tests that already exist. Read `tests/unit/` first.
> - Return: list of files written + a summary of what each test covers.

### Step 4 — orchestrator review

1. Read each new test file.
2. Run `pnpm test` — verify all new tests pass and no existing tests broke.
3. Check: do the tests actually cover the component's real behavior? Would they catch a regression in the logic that matters (state transitions, conditional rendering, event handling)? Reject tests that only assert static markup exists with no interaction.
4. If any test is weak or missing coverage → send back to subagent with specific instructions.

### Step 5 — update the PR

Add a "Component tests added" section to the PR body listing each new test file and what it covers.

### Step 6 — commit

```bash
git add tests/unit/ package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: add component tests for <component name>

Tests cover: <list what each test catches>
Written by /project:component-test subagent, reviewed and signed off by orchestrator."
```

### Step 7 — orchestrator sign-off

Output:

```
COMPONENT-TEST SIGN-OFF
========================
Branch: <branch>
Components changed: <list>
Qualifying for tests (logic, not markup-only): <list, or "none — skipped">
Tests written: <list file paths>
pnpm test: PASS (<N> tests, <N> new)
Coverage gaps: none / <list any known gaps>
Orchestrator verdict: APPROVED ✅ / NEEDS REVISION ❌
```

If verdict is NEEDS REVISION, loop back to Step 3 with the specific gaps listed.

---

## Full audit mode — `/project:component-test --full`

Diff mode only ever sees files touched by the current branch, so it can never surface *pre-existing* gaps — a logic-bearing component that shipped before this skill existed, or in a PR where the skill wasn't triggered, stays invisible forever under diff mode alone. Full mode scans the whole repo instead of `git diff`.

Run this periodically (e.g. once per sprint, or on request — "check test coverage", "any gaps?") rather than on every PR; it's a repo-health check, not a merge gate.

### Step 1 — enumerate logic-bearing components with no test file

```bash
for f in $(find components -name '*.tsx'); do
  grep -lE "useState|useEffect|useActionState|onClick|onChange|onSubmit" "$f" >/dev/null 2>&1 || continue
  name=$(basename "$f" .tsx)
  test -f "tests/unit/${name}.test.tsx" || echo "GAP: $f (no tests/unit/${name}.test.tsx)"
done
```

This is a heuristic, not ground truth — a component test file with a different naming convention still counts as covered. Before trusting a "GAP" line, `grep -rl "from '@/components/.../ComponentName'" tests/unit/` to check whether it's tested indirectly (e.g. as a subcomponent rendered by a page-level test) before treating it as uncovered.

### Step 2 — report before writing anything

List every confirmed gap with file path and a one-line description of what logic is untested (state transitions, conditional branches, event handlers). Present this to the user before spawning any writer subagent — full-repo backfill can be a lot of new test files, and the user may want to triage which gaps matter (a component slated for deletion isn't worth testing) rather than blanket-generate tests for all of them.

### Step 3 — write tests for approved gaps only

Same subagent prompt as Step 3 of diff mode, scoped to the user-approved subset of gaps. Same review, commit, and sign-off steps (4–7) apply, with the sign-off block's "Components changed" line replaced by "Components audited: <total scanned>, gaps found: <N>, backfilled: <N approved>".
