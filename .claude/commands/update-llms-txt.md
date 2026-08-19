# Update-LLMs-Txt — keep public/llms.txt in sync with the docs

Invoke with `/project:update-llms-txt` on any branch that changes `content/docs/**` — new pages, removed pages, or a materially different description of what the product does (not typo/wording fixes).

`public/llms.txt` is a hand-curated machine-readable summary for AI agents and LLM crawlers (the [llms.txt convention](https://llmstxt.org/) — unrelated to `robots.txt`, which controls crawler *access*, not content). It is **not** auto-generated from `content/docs/` and never should be — it's deliberately shorter and more opinionated than a full doc dump. This skill keeps it from silently drifting out of sync as the real docs change underneath it, without turning it into an auto-generated wall of links.

---

## What counts as a docs change requiring this skill

- A new or removed page under `content/docs/integrations/**`
- A new or removed top-level product capability documented in `content/docs/introduction.mdx`'s "What's actually in the box" table
- A change to the public docs base URL, the marketing site URL, the GitHub repo URL, or the MCP/Agent API endpoint paths
- A pricing change reflected in `content/docs/reference/billing-plans.mdx` or similar

Skip this skill for wording/typo fixes, troubleshooting-section additions, or any change that doesn't alter what the product *does* or *where things live*.

---

## Orchestrator steps

### Step 1 — read both sides

Read `public/llms.txt` in full, then read `content/docs/integrations/meta.json`'s `pages` array and `content/docs/introduction.mdx`'s capability table. Do not read every integration page in full — the goal is a structural diff (what exists vs. what llms.txt claims exists), not a content rewrite.

### Step 2 — check the Integrations list specifically

`llms.txt`'s `## Integrations` section should list every **support-channel integration** — the platforms a community's questions actually arrive from (Discord, Slack, Google Chat, Telegram, Email, GitHub, MCP server, Agent API). It should **not** list AI-provider-key pages (`openai.mdx`, `anthropic.mdx`, `google-gemini.mdx`, `groq.mdx`, `mistral.mdx`, `ollama.mdx`) or `stripe.mdx` — those are configuration references, not ingest channels, and don't belong in a "what can send questions into AnswerLoops" summary. Cross-check the list against `content/docs/integrations/meta.json`'s `pages` array to catch anything added or removed, applying that same channel-vs-config-reference filter.

### Step 3 — check links resolve

For every URL in `llms.txt`, confirm the path actually exists as a page under `content/docs/` (or is a real API route under `app/api/`). A stale link here is worse than no link — an LLM citing a 404 as a source erodes trust in every other claim on the page. Use the same base URL pattern already in the file (`https://answerloops.com/docs/...`) — never `docs.answerloops.com` (that subdomain is not provisioned, see PR #251) and never a stale repo owner/name.

### Step 4 — update, don't rewrite

Make the smallest edit that fixes what's actually stale — add/remove specific lines in the `## Integrations` or `## Links` section, adjust a capability bullet if a described feature no longer matches reality. Do not regenerate the whole file's prose (the "What it does" / "Who it's for" narrative sections) unless the product's actual positioning changed, not just its docs.

### Step 5 — verify

```bash
pnpm build
```

Confirms nothing else broke. `llms.txt` lives in `public/` so it isn't part of the MDX build, but this catches any accidental docs breakage from the same session.

### Step 6 — commit

```bash
git add public/llms.txt
git commit -m "docs: sync llms.txt with <what changed in the docs>

<one sentence on what was stale — new integration page not listed,
dead link, wrong domain, etc. — and why it matters for LLM crawlers
citing this file as a source>"
```

If `llms.txt` was already accurate, say so and skip the commit — don't create a no-op commit.
