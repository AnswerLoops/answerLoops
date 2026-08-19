# Environment Variables Reference

> Copy what you need into `.env`. Required vars are marked **required** — the app will not start without them. Everything else is optional and silently skipped when absent.

---

## Core (required)

```env
# Postgres — Neon connection string in prod, Docker locally
DATABASE_URL=postgresql://user:password@host/dbname

# Auth.js session secret — any random 32+ char string
# Generate: openssl rand -base64 32
AUTH_SECRET=

# AES-256-GCM encryption for bot tokens + AI API keys at rest
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=
```

---

## OAuth (at least one required)

```env
# GitHub OAuth App — https://github.com/settings/developers
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Discord OAuth App — https://discord.com/developers/applications
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=

# Google OAuth — https://console.cloud.google.com/apis/credentials
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

---

## Discord bot

```env
# Bot token from Discord Developer Portal → Bot tab
DISCORD_TOKEN=

# Comma-separated channel IDs the bot listens in
DISCORD_CHANNEL_IDS=123456789,987654321

# Random secret shared between bot and Next.js app
# Used to authenticate /api/ingest + /api/slash/* calls
BOT_SECRET=

# Where the bot POSTs messages (Next.js app URL)
BOT_TARGET_URL=http://localhost:3000

# Application ID from Discord Developer Portal → General Information
# Required to register /ask and /summarize slash commands
DISCORD_APPLICATION_ID=

# Optional: scope slash commands to one server for instant testing
# Omit for global commands (up to 1 hour to propagate)
DISCORD_GUILD_ID=
```

---

## AI providers

> Configure per-org in **Settings → AI Model** (stored encrypted in DB).
> These env vars are the platform-level fallback when no org config is set.

```env
# OpenAI (default fallback provider)
OPENAI_API_KEY=

# Anthropic (if using Claude models)
ANTHROPIC_API_KEY=

# Google (if using Gemini models)
GOOGLE_GENERATIVE_AI_API_KEY=

# Groq (if using Llama/Mixtral via Groq)
GROQ_API_KEY=

# Mistral
MISTRAL_API_KEY=
```

---

## Stripe billing

```env
# Secret key from Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=

# Webhook signing secret — Stripe Dashboard → Webhooks → your endpoint
STRIPE_WEBHOOK_SECRET=

# Price IDs from Stripe Dashboard → Products
# Create one product per plan; copy the price ID (price_xxx).
# Each var name matches its plan id — STRIPE_PRICE_STANDARD must hold the
# Standard price, not another plan's. A mismatch bills the wrong amount
# silently, since the displayed price comes from the code and the charged
# amount comes from Stripe.
STRIPE_PRICE_STANDARD=<standard plan monthly price id>
STRIPE_PRICE_PRO=<pro plan monthly price id>
STRIPE_PRICE_ENTERPRISE=<enterprise plan monthly price id>

# Annual prices. Each is a yearly recurring price charging twelve times the
# discounted monthly figure, and the pricing page bills against it directly
# rather than displaying a rate it cannot sell. A plan missing its annual var
# declines annual checkout rather than falling back to the monthly price —
# charging a different amount than the one displayed is the worse failure.
STRIPE_PRICE_STANDARD_ANNUAL=<standard plan annual price id>
STRIPE_PRICE_PRO_ANNUAL=<pro plan annual price id>
STRIPE_PRICE_ENTERPRISE_ANNUAL=<enterprise plan annual price id>
```

---

## Email (Resend)

```env
# https://resend.com — optional, silently skips if absent
RESEND_API_KEY=

# From address for outbound emails
RESEND_FROM=notifications@yourdomain.com

# Base URL for links in emails (e.g. ticket detail links)
AUTH_URL=https://yourdomain.com
```

---

## GitHub App (source-code aware answers)

```env
# From GitHub App settings — https://github.com/settings/apps
GITHUB_APP_ID=

# Private key (base64-encoded PEM)
# Encode: base64 -i your-app.private-key.pem | tr -d '\n'
GITHUB_APP_PRIVATE_KEY=

# Webhook secret configured in the GitHub App settings
GITHUB_WEBHOOK_SECRET=
```

---

## Web Push notifications (browser alerts)

```env
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:you@example.com
```

---

## URL ingest (Firecrawl)

```env
# https://firecrawl.dev — required for Settings → KB → Ingest URL
FIRECRAWL_API_KEY=

# Optional: point to a self-hosted Firecrawl instance
FIRECRAWL_API_URL=
```

---

## Networking

```env
# How many proxies sit between the public internet and this app.
# Rate limiters count this many entries in from the RIGHT of x-forwarded-for
# to find the real client IP — the leftmost entry is caller-supplied and
# trusting it lets anyone dodge per-IP limits by rotating a header value.
# 1 = single load balancer/CDN (Railway, Fly, one nginx). 2 = Cloudflare in
# front of a platform LB. Defaults to 1 when unset.
TRUST_PROXY_HOPS=1
```

---

## Development / testing

```env
# Set to 1 to bypass all external API calls (Discord, Slack, Resend, Stripe)
# Used in CI and local testing without live credentials
MOCK_EXTERNALS=1
```

---

## Quick-start minimal `.env`

The absolute minimum to run the app locally with Discord + OpenAI:

```env
DATABASE_URL=postgresql://community:community@localhost:5432/community
AUTH_SECRET=replace-with-random-32-char-string
ENCRYPTION_KEY=replace-with-64-char-hex-from-openssl-rand-hex-32

AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

OPENAI_API_KEY=

DISCORD_TOKEN=
DISCORD_CHANNEL_IDS=
BOT_SECRET=replace-with-any-random-string
BOT_TARGET_URL=http://localhost:3000
DISCORD_APPLICATION_ID=
```

Start Docker Postgres locally:
```bash
docker compose up postgres -d
```

Then run migrations + app:
```bash
pnpm dev
```

Bot (separate terminal):
```bash
pnpm bot:dev
```
