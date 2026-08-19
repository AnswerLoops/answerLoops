# Docker-Preview — rebuild + run the prod Docker stack locally, on-demand

Invoke with `/project:docker-preview` any time you want to actually look at the current branch running in the real prod Docker build — not `pnpm dev`, the real image.

The orchestrator (main Claude) tears down whatever's running, rebuilds from the current checkout, confirms the branch's actual changed routes are present in the built output, then hands off a specific "go check this" instead of a generic "go look."

---

## Why this exists

A stale `answerloops-app-1` container can sit there indefinitely serving an old image with zero error or warning — `docker compose up -d` without `--build` never rebuilds, and even `--build` only helps if the working tree was actually on the intended branch when it ran. This skill exists because that exact failure happened once already: a new page looked identical to the old page because the running container's build predated the branch that added it.

---

## Orchestrator steps

### Step 1 — confirm branch state

```bash
git branch --show-current
git status --short
```

If there are uncommitted changes, say so explicitly — the Docker build context is the working tree as it sits right now, not the last commit. That's usually what's wanted mid-iteration, but don't let it be a silent surprise.

### Step 2 — tear down existing containers

```bash
docker compose -f docker-compose.prod.yml down
```

Always do this first. Never assume a bare `up -d --build` on top of an already-running stack is equivalent — do the explicit teardown so there's no ambiguity about what's serving traffic afterward.

### Step 3 — rebuild and start

```bash
pnpm docker:preview
```

(wraps the down+build+up sequence — see `package.json`). This only rebuilds/starts the `app` service by default. If the branch touches `bot/**`, also run:

```bash
docker compose -f docker-compose.prod.yml up -d --build bot
```

`app` and `bot` share the same `answerloops:latest` image tag, so `app`'s rebuild covers `bot`'s code too — starting `bot` is only needed if you actually want to exercise Discord/Slack message handling locally, not just look at pages.

### Step 4 — verify the branch's actual changes are in the build

This is the step that catches today's exact bug instead of the user discovering it visually.

```bash
git diff main...HEAD --name-only -- 'app/**/page.tsx'
```

For each new or changed page route found, confirm it exists in the built output:

```bash
docker exec answerloops-app-1 sh -c "ls .next/server/app/<route> 2>&1 || echo 'NOT IN BUILD'"
```

If anything expected is missing, **stop here and report it** — don't tell the user to go check, that's the exact failure mode this skill exists to prevent. Most likely cause: the working tree wasn't actually on the intended branch when the build ran — go back to Step 1.

### Step 5 — wait for healthy, then hand off

```bash
docker compose -f docker-compose.prod.yml ps
```

Once `app` shows healthy, tell the user it's ready at `http://localhost:3000` and name the specific route(s) to check — derived from the Step 4 diff, not a generic "go look." E.g. "Check `/pricing` — that's the new page from this branch."
