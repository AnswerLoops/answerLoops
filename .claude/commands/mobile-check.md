# Mobile-Check — automated responsive audit for UI changes

Invoke with `/project:mobile-check` on any branch that adds or changes UI (pages, components, layouts).

The orchestrator (main Claude) deploys a subagent to audit the diff for mobile-responsive breakage, then — only if issues are found — deploys a second subagent to fix them. Orchestrator reviews and signs off.

---

## What counts as a UI change

- New or edited files under `app/**/*.tsx`, `app/**/page.tsx`, `app/**/layout.tsx`
- New or edited files under `components/**/*.tsx`
- Any change to `app/globals.css` or shared layout shells (`app/(dashboard)/layout.tsx`, marketing `Nav`)

If the diff touches none of the above, skip this skill entirely.

---

## Orchestrator steps

### Step 1 — audit the diff

```bash
git diff main...HEAD --stat -- 'app/**/*.tsx' 'components/**/*.tsx' 'app/globals.css'
```

List every changed UI file.

### Step 2 — deploy auditor subagent (read-only)

Spawn an Agent (subagent_type "Explore" or "claude", read-only) with this prompt:

> Audit these changed files for mobile-responsive breakage at a 375px viewport: [list files].
>
> Flag, per file:line:
> - Fixed pixel widths on containers that should flex/shrink (`w-56`, `min-w-[…]`, etc.) with no responsive override
> - `flex` rows with multiple children and no `flex-wrap` / no `flex-col` breakpoint
> - Tables (`<table>`) not wrapped in a container with `overflow-x-auto`
> - Nav/menu items hidden via `hidden md:flex` / `hidden sm:flex` with no hamburger/drawer fallback to reach them on mobile
> - Text sizes, padding, or grid columns that don't step down via `sm:`/`md:` prefixes when the desktop value is large
>
> Do not propose fixes. Return a file:line list of concrete issues, or "no issues found" if the diff is already responsive (e.g. it already uses `sm:`/`md:` prefixes correctly, tables are wrapped, no fixed widths).

### Step 3 — branch on result

- **No issues found** → skip to Step 6, sign off clean.
- **Issues found** → proceed to Step 4.

### Step 4 — deploy builder subagent (fixes only, same files)

Spawn an Agent (subagent_type "claude") with this prompt:

> Fix the following mobile-responsive issues found in [branch]: [paste auditor's file:line list].
>
> Rules:
> - Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — this repo has no custom breakpoints, defaults apply (`sm:640px md:768px lg:1024px`).
> - Tailwind v4, CSS-first config — no `tailwind.config.js` to edit.
> - Wrap any un-scrollable `<table>` in `<div className="overflow-x-auto">`.
> - Add `flex-wrap` (or a `flex-col sm:flex-row` swap) to any non-wrapping multi-item flex row.
> - If a nav/menu hides items via `hidden md:flex` with no fallback, build a hamburger + drawer using existing UI primitives in `components/ui/` if present, otherwise a minimal `useState` toggle — no new dependencies.
> - Do not touch files outside the flagged list unless a shared primitive (e.g. a new drawer component) must be created — if so, create it under `components/` and say so explicitly.
> - Return: list of files changed + one-line summary per file.

### Step 5 — orchestrator review

1. Read every file the builder touched (diff, not full file, if large).
2. Confirm each flagged issue from Step 2 was actually addressed.
3. Run the app (`/project:run` skill or `pnpm dev`) and check the changed page(s) at a 375px viewport in-browser — per AGENTS.md UI testing rule, do not claim success without this.
4. `pnpm build` — verify no type/build errors introduced.
5. If any fix is incomplete or the build fails → send back to builder subagent with specifics.

### Step 6 — sign-off

Output:

```
MOBILE-CHECK SIGN-OFF
======================
Branch: <branch>
UI files changed: <list>
Auditor result: clean / <N> issues found
Fixes applied: <list file paths, or "none needed">
Browser check @375px: PASS / FAIL — <what was verified>
pnpm build: PASS
Orchestrator verdict: APPROVED ✅ / NEEDS REVISION ❌
```

If verdict is NEEDS REVISION, loop back to Step 4 with the specific gaps.

### Step 7 — commit

Only if fixes were made:

```bash
git add <files>
git commit -m "fix: make <feature> responsive at mobile breakpoints

<what was broken — fixed widths / missing overflow wrapper / no
mobile nav fallback — and why it matters for mobile users>

Audited and fixed by /project:mobile-check, verified in-browser at
375px by orchestrator."
```
