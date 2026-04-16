# Entangle Wealth

A full-stack financial analysis platform built as a **pnpm monorepo**. Originally developed on Replit, it provides AI-powered stock analysis, paper trading, tax planning, gamification, and community features for families and individual investors.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Frontend Pages](#frontend-pages)
- [Key Features](#key-features)
- [Authentication](#authentication)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment (Firebase / Render)](#deployment)
- [Improvements & Scalability](#improvements--scalability)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4 |
| **UI Components** | shadcn/ui (Radix UI), Framer Motion, Recharts, Lightweight Charts, Leaflet |
| **State / Data** | TanStack React Query, React Hook Form, Zod |
| **Routing** | Wouter (lightweight client-side) |
| **Auth** | Clerk (React + Express SDKs) |
| **Backend** | Express 5, Node.js, Pino logger |
| **Database** | PostgreSQL + Drizzle ORM |
| **Payments** | Stripe (subscriptions, KYC) |
| **AI** | OpenAI (GPT-4o-mini), Anthropic Claude |
| **Market Data** | Alpaca Markets API (WebSocket + REST) |
| **Email** | Resend |
| **Monitoring** | OpenTelemetry, Sentry |
| **Build** | esbuild (server), Vite (client), pnpm workspaces |
| **Testing** | Playwright (E2E), autocannon (stress tests) |

---

## Project Structure

```
entangle-wealth/
├── artifacts/                    # Deployable applications
│   ├── api-server/               # Express 5 backend API
│   │   ├── src/
│   │   │   ├── index.ts          # Server entry point
│   │   │   ├── app.ts            # Express app setup & middleware
│   │   │   ├── routes/           # 50+ route files (REST + SSE)
│   │   │   ├── middlewares/      # Auth, CSRF, rate limiting, Clerk proxy
│   │   │   ├── lib/              # Business logic, event sourcing, quant engine
│   │   │   └── agents/           # 13+ orchestrated agents (alerts, risk, tax, etc.)
│   │   ├── build.mjs             # esbuild bundler config
│   │   └── stress/               # Load testing scripts (autocannon)
│   │
│   ├── entangle-wealth/          # React frontend SPA
│   │   ├── src/
│   │   │   ├── App.tsx           # Root component, Clerk provider, router
│   │   │   ├── pages/            # 50+ page components (lazy-loaded)
│   │   │   ├── components/       # Shared UI components (shadcn/ui based)
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── lib/              # Utils, API client, constants
│   │   │   └── index.css         # Tailwind config, theme variables, fonts
│   │   └── vite.config.ts        # Vite build config
│   │
│   └── mockup-sandbox/           # UI sandbox for testing
│
├── lib/                          # Shared workspace packages
│   ├── db/                       # Drizzle ORM schema & migrations (65 tables)
│   │   └── src/schema/           # Table definitions (source of truth)
│   ├── api-client-react/         # React hooks for API consumption
│   ├── api-zod/                  # Zod validation schemas for API
│   ├── integrations/
│   │   ├── openai-ai-server/     # OpenAI server-side integration
│   │   ├── openai-ai-react/      # OpenAI React integration
│   │   └── anthropic-ai/         # Anthropic Claude integration
│   ├── occupations/              # Occupation taxonomy for tax/AI context
│   └── xp/                       # XP & gamification system logic
│
├── contracts/                    # Smart contract files (EntangleCoin)
├── docs/                         # Documentation
├── e2e/                          # Playwright E2E tests
├── scripts/                      # Utility scripts
├── exports/                      # Data export outputs
│
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # Workspace definitions + security (minimumReleaseAge)
├── tsconfig.base.json            # Shared TypeScript config (ES2022, strict)
└── drizzle.config.ts             # Drizzle Kit config (in lib/db/)
```

---

## Database Schema

**65 tables** managed via Drizzle ORM. Schema source of truth: `lib/db/src/schema/`.

### Core Tables

| Domain | Tables | Purpose |
|---|---|---|
| **Users** | `users` | Profiles, Clerk ID, KYC, subscription tier, wallet, referral code |
| **Paper Trading** | `paper_portfolios`, `paper_trades`, `paper_positions`, `paper_orders`, `paper_options_trades`, `paper_options_positions`, `virtual_cash_purchases`, `daily_portfolio_snapshots` | Virtual trading with $100K starting balance |
| **Event Sourcing** | `strategy_events`, `portfolio_snapshots` | Append-only trade log, point-in-time state recovery |
| **Quant Pipeline** | `quant_evaluation_runs`, `quant_model_scores`, `quant_stress_results`, `quant_refinement_history`, `quant_engine_runs` | 6-model evaluation (M1-M6), stress tests |
| **Strategies** | `strategy_evaluations`, `strategy_versions`, `custom_strategies` | Strategy backtesting, version control, comparison |
| **Tax** | Tax data via `taxflow` routes | FIFO/LIFO, wash sales, harvesting |
| **Alerts** | `alerts`, `alert_history` | Price alerts with email/push delivery |
| **Gamification** | `streaks`, `badges`, `user_badges`, `leaderboard_snapshots`, `user_xp`, `xp_transactions`, `daily_spins`, `challenges`, `user_challenges` | Engagement system |
| **Referrals** | `referrals`, `reward_distributions`, `founder_status`, `giveaway_entries` | Referral & reward tracking |
| **Content** | `daily_content_posts`, `messages`, `conversations`, `email_subscribers`, `push_subscriptions` | AI content, messaging, notifications |
| **Resume/Jobs** | `resumes`, `resume_education`, `resume_experiences`, `saved_jobs`, `gigs` | Career tools |
| **Financial** | `wealth_profiles`, `wealth_snapshots`, `timelines`, `timeline_results`, `simulation_runs`, `balance_transactions` | Wealth tracking, simulations |
| **Admin** | `audit_log`, `agent_logs`, `agent_events`, `api_health_checks`, `analytics_events`, `webhook_events` | Monitoring, audit trail |

---

## API Routes

Backend runs on Express 5. Entry: `artifacts/api-server/src/index.ts`. Default port: `PORT` env var.

### Core

| Endpoint | Description |
|---|---|
| `GET /api/health`, `/healthz` | Health checks |
| `GET /status/services` | Service status |
| `POST /api/auth` | Auth event tracking |
| `POST /api/stripe` | Stripe webhooks |

### Trading & Market Data

| Endpoint | Description |
|---|---|
| `GET/POST /api/paper-trading/*` | Paper trading (orders, positions, cash) |
| `GET /api/stocks/*` | Stock data lookup |
| `GET /api/prices/*` | Price feeds (REST) |
| `GET /api/price-stream` | SSE real-time price streaming |
| `GET /api/alpaca/*` | Alpaca Markets proxy |
| `GET /api/alerts/*` | Price alerts CRUD |
| `GET /api/alerts/stream` | SSE alert notifications |

### Quant & Strategy

| Endpoint | Description |
|---|---|
| `POST /api/quant/evaluate/*` | Quant evaluation pipeline |
| `GET /api/quant/signals` | Quant signals |
| `POST /api/evaluate` | Multi-model strategy evaluation |
| `GET /api/evaluate/:jobId` | Evaluation results |
| `POST /api/evaluate/:id/stress` | Stress testing |
| `POST /api/evaluate/:id/refine` | Parameter refinement |
| `GET /api/evaluate/rankings` | Strategy rankings |
| `GET /api/evaluate/:id/versions` | Version history |
| `POST /api/strategies` | Custom strategy CRUD |

### Financial Tools

| Endpoint | Description |
|---|---|
| `GET/POST /api/taxflow/*` | Tax analysis (FIFO/LIFO, wash sales, harvesting) |
| `POST /api/taxgpt` | Tax GPT chatbot |
| `POST /api/analyze` | AI-powered stock analysis |
| `GET /api/timeline/*` | Financial timeline scenarios |
| `GET /api/simulation/*` | Wealth simulations |
| `GET /api/news` | News with sentiment analysis |

### User & Account

| Endpoint | Description |
|---|---|
| `GET/PUT /api/users/me` | Profile management |
| `GET /api/users/me/export` | Full data export |
| `DELETE /api/users/me` | Account deletion (cascading) |
| `POST /api/kyc` | KYC verification |
| `GET /api/gamification/*` | Streaks, badges, leaderboards |

### Content & Community

| Endpoint | Description |
|---|---|
| `GET /api/daily-content` | AI-generated daily content |
| `POST /api/coaching` | AI coaching sessions |
| `GET /api/community/*` | Groups, feed, messaging |
| `POST /api/feedback` | User feedback |
| `POST /api/push` | Web push notifications |

### Admin

| Endpoint | Description |
|---|---|
| `GET /api/audit` | Audit logs |
| `GET /api/agents` | Agent orchestration status |
| `GET /api/metrics` | Performance metrics |
| `GET /api/analytics` | Usage analytics |

---

## Frontend Pages

SPA built with React 19 + Wouter. All pages lazy-loaded. Entry: `artifacts/entangle-wealth/src/App.tsx`.

### Main Navigation (5 core links)

| Route | Page |
|---|---|
| `/` | Home / Marketing landing |
| `/dashboard` | Personalized dashboard hub |
| `/stocks` | Stock Explorer |
| `/tax` | Tax dashboard |
| `/leaderboard` | Competition leaderboard |
| `/pricing` | Subscription pricing |

### Financial Tools (~15 pages)

`/options`, `/charts`, `/technical-analysis`, `/screener`, `/terminal` (Bloomberg-style Mirofish), `/market-overview`, `/volatility-lab`, `/sector-flow`, `/open-source-intel`, `/quant-signals`, `/strategy-builder`, `/strategy-evaluator`, `/eval-pipeline`, `/alternate-timeline`, `/time-machine`, `/wealth-sim`

### Tax Suite (~5 pages)

`/tax`, `/tax-gpt`, `/tax-strategy`, `/receipts`, `/tax-year-summary`

### Account & Auth (~5 pages)

`/sign-in`, `/sign-up`, `/profile`, `/onboarding`, `/integrations`

### Engagement (~8 pages)

`/achievements`, `/gamification`, `/token-wallet`, `/alerts`, `/community`, `/earn`, `/reward-history`, `/case-study`

### Career (~5 pages)

`/resume`, `/jobs`, `/gigs`, `/habits`, `/life-outcomes`, `/ai-coach`

### Admin (~7 pages)

`/admin`, `/admin/kyc`, `/admin/audit`, `/admin/monitoring`, `/admin/tickets`, `/admin/launch`, `/admin/scalability`, `/admin/status`

### Legal & Info

`/about`, `/help`, `/blog`, `/terms`, `/privacy`, `/cookies`, `/disclaimer`, `/dmca`, `/accessibility`

---

## Key Features

### 1. Quantum Entanglement Analysis
7 specialized AI agents cross-check each other for consensus-based stock signals. Uses OpenAI GPT-4o-mini with a 6-model scoring pipeline (Trend Alignment, Mean Reversion, Momentum Quality, Risk-Adjusted Return, Volume/Liquidity, Cross-Timeframe Consistency). Includes stress testing and parameter refinement.

### 2. Quant Strategy Engine v2
Parallel worker-thread execution of 1000+ parameterized strategies across 60 stocks. 12+ technical indicators (RSI, EMA, SMA, MACD, Bollinger, Stochastic, CCI, ROC, OBV, CMF, Williams %R, ADX). Multi-timeframe (daily + intraday). O(n) backtest via pre-computed indicator arrays.

### 3. Paper Trading (Event-Sourced)
Virtual trading with real Alpaca market data. $100K starting balance. Supports market/limit/stop orders and options. Event-sourced architecture with append-only log, idempotency keys, time-travel replay, and automatic snapshots. Anti-cheat: server-locked prices, audit trail.

### 4. TaxFlow Intelligence
Real-time tax impact on trades. FIFO/LIFO lot matching, wash sale detection (30-day window), tax-loss harvesting, YTD summaries, EOY projections. 27 tax strategies. Receipt capture. AI document analysis.

### 5. Terminal (Mirofish)
Bloomberg-style multi-panel interface with command-line UX. Integrated TaxFlow engine, real-time price feeds, and trading execution.

### 6. Gamification
Daily streaks, 44px+ touch targets, badges, XP system, leaderboards, daily spin wheel, challenges, referral rewards, founder status tracking.

### 7. Agent Orchestration
13+ autonomous agents (AlertEvaluator, Portfolio, Risk, Tax, Strategy, Learning, Pattern, Recovery) with event-bus pub/sub, lifecycle management, and database audit logging.

### 8. Real-Time Market Data
3-layer pipeline: Alpaca WebSocket → REST polling fallback → in-memory cache. SSE streaming with 100ms throttle, per-IP connection limits, heartbeat keepalive.

---

## Authentication

**Clerk** handles all auth (sign-up, sign-in, session management, user metadata).

- Backend: `@clerk/express` middleware
- Frontend: `@clerk/react` + `@clerk/ui` components
- Auth pages: Custom Bloomberg Terminal-style UI (`TerminalAuthShell`)
- FAPI Proxy: `/__clerk` path for production
- Protected routes: `<Show when="signed-in">` wrappers
- Admin: `useIsAdmin()` hook

---

## Security

| Feature | Implementation |
|---|---|
| HTTP Headers | Helmet with CSP |
| CORS | Restricted to allowed origins |
| Rate Limiting | Global: 120 req/min, AI: 15 req/min, custom per-route |
| CSRF | Token-based protection middleware |
| Input Sanitization | XSS + SQL injection patterns, AI input sanitizer |
| Brute Force | Protection on `/auth`, `/kyc`, `/stripe` |
| SSRF | Domain allowlist + DNS validation on news fetcher |
| Map Bounds | `BoundedRateLimitMap` / `CooldownMap` with TTL + max-size caps |
| Webhook Security | Stripe idempotency via `webhook_events` dedup |
| Supply Chain | `minimumReleaseAge: 1440` in pnpm (1-day delay on new packages) |

---

## Environment Variables

### Required

```env
# Server
CLERK_SECRET_KEY=sk_...           # Clerk backend secret
DATABASE_URL=postgresql://...      # PostgreSQL connection string
PORT=8080                          # Server port

# Frontend (VITE_ prefix)
VITE_CLERK_PUBLISHABLE_KEY=pk_... # Clerk frontend key
```

### Optional

```env
# Market Data
ALPACA_KEY_ID=...                  # Alpaca Markets API key
ALPACA_SECRET_KEY=...              # Alpaca Markets secret

# AI
# OpenAI is used via Replit proxy (no key needed on Replit)
# Anthropic Claude via Replit AI Integrations proxy

# Email & Notifications
RESEND_API_KEY=...                 # Resend email service

# Monitoring
SENTRY_AUTH_TOKEN=...              # Sentry source map upload

# Clerk Production Proxy
VITE_CLERK_PROXY_URL=...           # Custom FAPI proxy URL (production)

# Internal
API_INTERNAL_BASE_URL=...          # Health check URL
ALLOW_PORT_EVICTION=true           # Kill stale processes on port conflict
```

---

## Local Development

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9 (enforced — npm/yarn will fail)
- **PostgreSQL** instance (local or cloud)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
#    Create .env in artifacts/api-server/ and artifacts/entangle-wealth/
#    with the required variables listed above

# 3. Push database schema (Drizzle)
cd lib/db
pnpm drizzle-kit push

# 4. Build all packages
cd ../..
pnpm build

# 5. Start API server
cd artifacts/api-server
pnpm dev          # Builds + starts on PORT (default 8080)

# 6. Start frontend (separate terminal)
cd artifacts/entangle-wealth
pnpm dev          # Vite dev server on port 3000
```

### Build Scripts

| Command | Scope | Description |
|---|---|---|
| `pnpm build` | Root | Typecheck + build all packages |
| `pnpm typecheck` | Root | TypeScript validation across workspace |
| `pnpm test:e2e` | Root | Playwright end-to-end tests |
| `pnpm dev` | api-server | Build + start API |
| `pnpm dev` | entangle-wealth | Vite dev server with HMR |
| `pnpm stress` | api-server | Run all 5 stress test suites |

---

## Deployment

### Option A: Render

Render is the recommended choice — it supports Node.js natively, has managed PostgreSQL, and handles the monorepo build well.

#### Backend (Web Service)

1. **Create a Web Service** on Render, connect your Git repo
2. **Build Command:**
   ```bash
   pnpm install && pnpm build
   ```
3. **Start Command:**
   ```bash
   node artifacts/api-server/dist/index.mjs
   ```
4. **Environment:**
   - Set `PORT` (Render provides this automatically)
   - Set `DATABASE_URL` (use Render's managed PostgreSQL or external)
   - Set `CLERK_SECRET_KEY`, `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`, `RESEND_API_KEY`
   - Set `NODE_ENV=production`
5. **Root Directory:** Leave as repo root (monorepo needs full workspace)

#### Frontend (Static Site)

1. **Create a Static Site** on Render
2. **Build Command:**
   ```bash
   pnpm install && pnpm build
   ```
3. **Publish Directory:** `artifacts/entangle-wealth/dist/public`
4. **Environment:**
   - Set `VITE_CLERK_PUBLISHABLE_KEY`
   - Set `VITE_CLERK_PROXY_URL` (if using custom Clerk FAPI proxy)
5. **Rewrite Rule:** Add a catch-all rewrite `/*` → `/index.html` (SPA routing)

#### Database

- Use **Render PostgreSQL** (managed) or an external provider (Neon, Supabase, etc.)
- Run schema push after first deploy:
  ```bash
  cd lib/db && DATABASE_URL=<your-url> pnpm drizzle-kit push
  ```

### Option B: Firebase

Firebase works but requires more configuration since it's not a natural fit for Express backends.

#### Frontend (Firebase Hosting)

1. Install Firebase CLI: `npm i -g firebase-tools`
2. Initialize: `firebase init hosting`
3. Set public directory: `artifacts/entangle-wealth/dist/public`
4. Enable SPA rewrites: Yes (rewrite all to `/index.html`)
5. Build and deploy:
   ```bash
   pnpm install && pnpm build
   firebase deploy --only hosting
   ```

#### Backend (Cloud Run via Firebase)

Firebase Hosting can't run Express directly. Use **Cloud Run**:

1. Create a `Dockerfile` at repo root:
   ```dockerfile
   FROM node:20-slim AS base
   RUN corepack enable && corepack prepare pnpm@latest --activate

   WORKDIR /app
   COPY . .
   RUN pnpm install --frozen-lockfile
   RUN pnpm build

   EXPOSE 8080
   ENV PORT=8080
   CMD ["node", "artifacts/api-server/dist/index.mjs"]
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy entangle-api \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "DATABASE_URL=...,CLERK_SECRET_KEY=..."
   ```
3. Point Firebase Hosting rewrites for `/api/**` to the Cloud Run service in `firebase.json`:
   ```json
   {
     "hosting": {
       "rewrites": [
         { "source": "/api/**", "run": { "serviceId": "entangle-api", "region": "us-central1" } },
         { "source": "**", "destination": "/index.html" }
       ]
     }
   }
   ```

#### Database

- Use **Cloud SQL for PostgreSQL** or an external provider (Neon, Supabase)
- Firebase does not offer managed PostgreSQL directly

### Post-Deployment Checklist

- [ ] Run `drizzle-kit push` against production database
- [ ] Configure Clerk production instance (allowed origins, redirect URLs)
- [ ] Set up Stripe webhook endpoint pointing to your production `/api/stripe` URL
- [ ] Configure CORS allowed origins in the API server for your production domain
- [ ] Set up Sentry DSN for production error tracking
- [ ] Configure Alpaca API keys (paper or live)
- [ ] Test Clerk FAPI proxy if using custom domain
- [ ] Verify health endpoint: `GET /api/health`

---

## Improvements & Scalability

### High Priority

| Area | Issue | Recommendation |
|---|---|---|
| **Remove Replit coupling** | esbuild overrides exclude all platforms except linux-x64; Replit-specific Vite plugins and env vars | Remove platform overrides in `pnpm-workspace.yaml`, replace `@replit/*` Vite plugins with standard alternatives, remove `REPL_ID`/`REPLIT_DOMAINS` checks |
| **Environment config** | No `.env.example` file; env vars scattered across files | Create `.env.example` at root with all required/optional vars documented |
| **Database migrations** | Uses `drizzle-kit push` (dev-only schema sync); no migration files | Switch to `drizzle-kit generate` + `drizzle-kit migrate` for versioned, reviewable migrations |
| **Test coverage** | Only E2E (Playwright) and stress tests; no unit/integration tests | Add Vitest for unit tests (business logic, quant engine) and API integration tests |
| **Error handling** | Some routes may leak internal errors in production | Ensure all routes use centralized error handler; never send stack traces in production |

### Scalability

| Area | Current | Recommended |
|---|---|---|
| **Worker threads** | Quant engine uses Node worker threads (single machine) | Extract to a job queue (BullMQ + Redis) for horizontal scaling |
| **SSE connections** | In-memory per-process; limited by server memory | Move to Redis pub/sub for SSE across multiple instances |
| **Rate limiting** | In-memory maps (`BoundedRateLimitMap`) | Use Redis-backed rate limiting for multi-instance deployments |
| **Agent orchestration** | In-process event bus | Extract to Redis Streams or a message broker for multi-process |
| **Caching** | In-memory price cache | Add Redis cache layer for shared state across instances |
| **Database** | Single PostgreSQL | Add read replicas; use connection pooling (PgBouncer) in production |
| **Static assets** | Served by Express in some configs | Always serve frontend from CDN (Cloudflare, Render, Firebase Hosting) |
| **AI rate limits** | 15 req/min in-memory | Queue AI requests via BullMQ with priority and retry logic |

### Code Quality

| Area | Recommendation |
|---|---|
| **Feature sprawl** | 50+ pages, many niche features (gigs, resume, habits). Consider pruning unused features or splitting into separate micro-frontends |
| **Shared types** | `lib/api-zod` exists but not consistently used across all routes. Enforce Zod validation on all API inputs/outputs |
| **Bundle size** | Large dependency count (60+ frontend deps). Audit with `vite-bundle-visualizer`; consider dropping unused libraries |
| **API versioning** | No versioning. Add `/api/v1/` prefix before scaling the user base |
| **Logging** | Pino is set up but log levels and structured fields should be standardized across all routes |
| **CI/CD** | No CI pipeline visible. Add GitHub Actions for typecheck, lint, test, and build on every PR |

### DevOps

| Area | Recommendation |
|---|---|
| **Docker** | Create multi-stage Dockerfile for consistent builds |
| **CI pipeline** | GitHub Actions: `pnpm install` → `typecheck` → `test` → `build` |
| **Health checks** | `/api/health` exists; configure Render/Cloud Run to use it |
| **Secrets management** | Use platform-native secrets (Render env groups, GCP Secret Manager) |
| **Monitoring** | OpenTelemetry + Sentry is solid; add alerting rules for error rate spikes |
| **Database backups** | Configure automated daily backups on your PostgreSQL provider |

---

## License

MIT (as declared in root `package.json`)
