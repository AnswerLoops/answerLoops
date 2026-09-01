<div align="center">

<img src="./.github/readme/hero.svg" alt="AnswerLoops — open-source AI support infrastructure for teams whose support lives in a community" width="100%" />

<br />

[![CI](https://img.shields.io/github/actions/workflow/status/answerLoops/answerLoops/ci.yml?branch=main&label=CI&logo=github&style=flat-square)](https://github.com/answerLoops/answerLoops/actions/workflows/ci.yml)
[![Security](https://img.shields.io/github/actions/workflow/status/answerLoops/answerLoops/security.yml?branch=main&label=security&logo=github&style=flat-square)](https://github.com/answerLoops/answerLoops/actions/workflows/security.yml)
[![License](https://img.shields.io/github/license/answerLoops/answerLoops?style=flat-square&label=license&color=2563eb)](./LICENSE)

[Website](https://answerloops.com) · [Documentation](https://answerloops.com/docs) · [Hosted app](https://app.answerloops.com) · [Quickstart](#run-it-locally) · [Architecture](#how-the-loop-works)

</div>

# AnswerLoops — AI support that lives in your community

**Your community asks the same questions every day. AnswerLoops answers them right in the channel — Discord, Slack, your forum, email — and only when it's confident enough to be right.**

AnswerLoops is an open-source, self-hosted AI support agent for teams whose support happens in a community instead of a help-desk inbox. It turns repeat questions from Discord, Slack, Discourse and Circle forums, GitHub, Telegram, email, and an embeddable web widget into one structured support pipeline, with confidence-gated automation and human escalation for uncertain answers.

It is built for teams whose users ask for help in a community instead of a support ticket — software and dev-tool companies, open-source projects, course creators with a paid community, game studios with a player Discord, crypto and DAO projects — and who want support automation they can inspect, extend, and run on their own infrastructure, not a generic chatbot or a seat-based helpdesk.

The important part is the gate between “the model produced text” and “a customer saw it.” AnswerLoops retrieves evidence from your knowledge base and connected repositories, drafts an answer, and asks a separate reviewer pass to grade it. Strong answers can be posted automatically; uncertain answers stay in the human queue with the context and draft attached.

Resolved conversations can become new knowledge, negative feedback removes weak answers from retrieval, and the knowledge-gaps dashboard shows what your docs still need to cover. The result is a support system that gets more useful as it handles real questions—not another chatbot floating beside your documentation.

<div align="center">
  <img src="./.github/readme/dashboard.png" alt="AnswerLoops dashboard showing deflection rate, open tickets, AI drafts, SLA status, and recent support activity" width="100%" />
</div>

## Why teams build on AnswerLoops

| | Capability | What it gives you |
|---|---|---|
| **01** | **Confidence-gated automation** | A dedicated reviewer pass controls whether an answer is posted or routed to a human. Thresholds are configurable, and bug or feature-request tickets stay human-led. |
| **02** | **One multi-channel pipeline** | Discord, Slack, Discourse and Circle forums, GitHub Issues and Discussions, Telegram, email, and web chat all produce the same org-scoped ticket model (Google Chat too). |
| **03** | **Grounded retrieval** | Search across crawled documentation, uploaded files, published KB articles, resolved tickets, and connected GitHub repositories. |
| **04** | **Model freedom** | Use OpenAI, Anthropic, Google Gemini, Groq, Mistral, Ollama, or another OpenAI-compatible endpoint with your own credentials. |
| **05** | **Agent-native access** | Expose the same knowledge and support workflows over MCP JSON-RPC or a documented REST API with an OpenAPI schema. |
| **06** | **Operational control** | Run the app, listener, and Postgres yourself; keep tenant data scoped by organization; encrypt integration credentials at rest. |

## How the loop works

```text
 Discord · Slack · Discourse · Circle · GitHub · Telegram · Email · Web widget
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Validate + normalize   │
                    │  Deduplicate + triage   │
                    │  Create ticket + SLA    │
                    └────────────┬────────────┘
                                 │
                                 ▼
            ┌────────────────────────────────────────┐
            │ Search KB articles, docs, code, and    │
            │ previously resolved conversations      │
            └───────────────────┬────────────────────┘
                                │
                         draft grounded answer
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Independent AI review   │
                    │ Confidence + evidence   │
                    └───────────┬─────────────┘
                       above threshold?
                         yes /       \ no
                            ▼         ▼
                    post in thread   human queue
                            │         with draft
                            └────┬────┘
                                 ▼
                       feedback + resolution
                                 │
                         promote useful answers
                          back into the KB
```

The shared ingest pipeline lives in [`lib/ingest/pipeline.ts`](./lib/ingest/pipeline.ts). Channel-specific adapters only handle verification, normalization, and reply delivery; ticket creation, retrieval, drafting, review, analytics, and escalation stay consistent across channels.

## What ships in the repository

### Channels and conversations

- Discord text channels, forum threads, reactions, slash commands, and multiple connected servers
- Slack Events API or polling mode, plus in-thread replies
- Discourse and Circle forum ingestion and replies
- Google Chat space pairing and replies
- GitHub Issues, issue comments, Discussions, discussion comments, and repository sync
- Telegram webhook ingestion and replies
- Provider-agnostic inbound email, threaded replies, and Gmail or Outlook send-only OAuth
- Embeddable website chat with lead capture and a published-KB-only retrieval boundary

### Knowledge and automation

- Website crawling, GitHub repository sync, Notion workspace sync, and PDF, DOCX, Markdown, text, or CSV uploads
- Semantic search over KB articles and resolved support history
- AI triage, priority, category, SLA deadlines, grounded drafting, and confidence review
- Configurable auto-deflection, human escalation, CSAT feedback, and simulation mode
- Knowledge-gap reporting and FAQ generation

### Product and platform

- Unified inbox, ticket detail timeline, live updates, analytics, ROI estimates, and CSV exports
- Organizations, roles, invitations, onboarding, per-org API keys, and tenant-isolated data access
- Browser push and email notifications
- Hosted billing support plus a complete self-hosted deployment path
- MCP tools and REST endpoints for KB search, FAQs, tickets, and answer generation

<details>
<summary><strong>See the unified inbox</strong></summary>
<br />
<img src="./.github/readme/tickets.png" alt="Unified AnswerLoops inbox with support tickets from multiple channels" width="100%" />
</details>

<details>
<summary><strong>See confidence review and escalation</strong></summary>
<br />
<img src="./.github/readme/ticket-detail.png" alt="AnswerLoops ticket detail with AI confidence review, evidence, and human escalation" width="100%" />
</details>

## Run it locally

The fastest complete development environment uses Docker Compose. It starts the Next.js app, the channel-listener service, and PostgreSQL, then runs Drizzle migrations automatically.

### Prerequisites

- Docker Engine with Docker Compose
- A Google OAuth client for dashboard sign-in
- An API key for one supported AI provider

### 1. Clone and configure

```bash
git clone https://github.com/answerLoops/answerLoops.git
cd answerLoops
cp .env.example .env
```

Generate independent secrets:

```bash
openssl rand -hex 32 # AUTH_SECRET
openssl rand -hex 32 # ENCRYPTION_KEY
openssl rand -hex 32 # BOT_SECRET
```

Then set at least these values in `.env`:

```dotenv
AUTH_URL=http://localhost:3000
AUTH_SECRET=<your-generated-auth-secret>
ENCRYPTION_KEY=<your-generated-32-byte-hex-key>
BOT_SECRET=<your-generated-bot-secret>

AUTH_GOOGLE_ID=<your-google-oauth-client-id>
AUTH_GOOGLE_SECRET=<your-google-oauth-client-secret>

OPENAI_API_KEY=<your-openai-api-key>
```

Use `http://localhost:3000/api/auth/callback/google` as the Google OAuth redirect URI. The development Compose file supplies the local `DATABASE_URL`; configure a real Postgres URL separately for production.

### 2. Start the stack

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000), sign in, and complete onboarding. To verify the server independently:

```bash
curl http://localhost:3000/api/health
# {"ok":true}
```

> [!WARNING]
> `docker compose down` stops the stack and preserves your database. Adding `-v` deletes the named Postgres volume and its data.

For deployment, provider-specific setup, and every environment variable, follow the [self-hosting documentation](https://answerloops.com/docs/quickstart-self-host).

## Native development

Use Node.js 20.9 or newer and pnpm. Keeping Postgres in Docker is convenient while running the application processes directly:

```bash
docker compose up -d postgres
pnpm install
cp .env.example .env.local
```

Set `DATABASE_URL=postgresql://community:community@localhost:5432/community` and the required values above in `.env.local`. Next.js loads that file for the web app. To run both the web app and listener from the same shell, export it first:

```bash
set -a
source .env.local
set +a
pnpm dev:all
```

The main development commands are:

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Next.js development server |
| `pnpm bot` | Start the Discord/Slack listener in watch mode |
| `pnpm dev:all` | Run the app and listener together |
| `pnpm lint` | Run Oxlint |
| `pnpm test` | Run the Vitest unit and integration suite |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test:e2e:typecheck` | Type-check the Playwright suite |
| `pnpm build` | Create the production Next.js build |

## Repository map

```text
app/                 Next.js pages, server actions, webhooks, REST, and MCP
bot/                 Discord gateway and Slack polling listener
components/          Dashboard, onboarding, marketing, and widget UI
lib/ai/              Retrieval, agents, embeddings, triage, and review
lib/ingest/          Shared multi-channel support pipeline
lib/db/              Drizzle schema, migrations, and org-scoped queries
content/docs/        Fumadocs product, integration, and self-hosting docs
drizzle/             Ordered PostgreSQL migrations
tests/unit/          Vitest regression and component tests
e2e/                 Playwright end-to-end coverage
public/widget.js     Embeddable widget loader
```

The production topology is deliberately small: the `app` and `bot` processes are built from the same multi-stage image, with PostgreSQL as the durable store. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the deeper pipeline and data-model walkthrough.

## Build with the APIs

Create an organization API key in **Settings → API Keys**, then use either surface:

| Surface | Endpoint | Best for |
|---|---|---|
| MCP | `POST /api/mcp` | Claude, Cursor, and other MCP-compatible agents |
| REST | `/api/agent/*` | Services, scripts, and custom integrations |
| OpenAPI | `GET /api/agent/openapi.json` | Typed clients and API exploration |

Available operations cover knowledge-base search, FAQ retrieval, ticket listing and creation, and grounded answer generation. Start with the [MCP guide](https://answerloops.com/docs/integrations/mcp) or [Agent API reference](https://answerloops.com/docs/integrations/agent-api).

## Contributing

AnswerLoops is preparing for a broader open-source launch, and focused contributions are welcome. Before opening a pull request:

1. Open or reference an issue so the intended behavior is clear.
2. Keep tenant isolation explicit in every data access path.
3. Add regression coverage for behavior changes.
4. Run `pnpm lint`, `pnpm test`, and `pnpm build`.
5. Update the relevant page under `content/docs/` when product behavior, architecture, setup, or an integration changes.

For vulnerabilities, follow [`SECURITY.md`](./SECURITY.md) instead of opening a public issue.

## License

AnswerLoops is licensed under [AGPL-3.0](./LICENSE). You can inspect, modify, and self-host it. If you run a modified version as a network service, the AGPL requires you to make the corresponding source available to its users.

<div align="center">

**Make the next repeat question the last one.**

[Explore the docs](https://answerloops.com/docs) · [Run it locally](#run-it-locally) · [Open an issue](https://github.com/answerLoops/answerLoops/issues)

</div>
