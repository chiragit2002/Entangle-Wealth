# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **AI**: OpenAI via Replit AI Integrations proxy (`@workspace/integrations-openai-ai-server`)

## Artifacts

### EntangleWealth (`artifacts/entangle-wealth`)
- Financial analysis platform with dark theme (black bg, electric blue #00D4FF, gold #FFD700)
- Pages: Landing (/), Dashboard (/dashboard), Earn (/earn), Options Signals (/options), Stock Explorer (/stocks), Terminal (/terminal), About (/about)
- Tone: Honest, no-hype, no AI slop. Straightforward about what the platform does and doesn't do.
- Core concept: Multiple AI analysis methods (price action, volume, options flow, Greeks, sentiment, risk) run simultaneously and cross-check each other via "quantum entanglement." Signals only fire on consensus.
- Mission: Help everyday families make better financial decisions.

#### Stock Explorer (/stocks)
- 5,000 NASDAQ-listed stocks with searchable/filterable table
- Top Gainers, Top Losers, Sector Overview panels
- Click any stock for detail view with 52-week range bar, market data
- AI-powered "Quantum Entanglement Analysis" — 7 specialized agents analyze each stock via OpenAI (gpt-5-mini for full, gpt-5-nano for quick)
- Rate limited: 10 AI requests per minute per IP
- All data is simulated/demo — disclaimer shown on every AI output

#### Terminal (/terminal)
- MirofishTerminal with live order flow, news feed, system log panels
- Commands: HELP, QUOTE, ANALYZE (AI), SEARCH (API), RISK, STATUS, SIGNALS, PORTFOLIO, CLEAR
- Position calculator and P&L simulator below terminal

#### Other Features
- Email waitlist, live scrolling market ticker, Flash Council live ticker
- Stock signals with confidence scores and reasoning notes
- Options flow alerts with context, Greeks table with IV rank
- Portfolio value area chart + options income bar chart (recharts)
- Income opportunities page (gigs + freelance + options strategies)
- Risk disclaimers on every data page

#### Design System
- Fonts: JetBrains Mono (data), Inter (UI)
- CSS utilities: `.electric-text` (blue gradient), `.gold-text` (gold gradient), `.glass-panel`
- Routing: wouter for client-side routing
- Mobile responsive with hamburger navigation

### API Server (`artifacts/api-server`)
- Express 5 on port defined by PORT env var
- Routes:
  - `GET /api/health` — health check
  - `GET /api/stocks` — search/filter/sort/paginate 5000 stocks (params: q, sector, capTier, page, limit, sortBy, sortDir)
  - `GET /api/stocks/movers` — top gainers and losers
  - `GET /api/stocks/sectors` — sector summary with counts and avg change
  - `GET /api/stocks/:symbol` — single stock detail
  - `POST /api/stocks/:symbol/analyze` — full 7-agent AI analysis (gpt-5-mini)
  - `POST /api/stocks/:symbol/quick-analyze` — quick summary (gpt-5-nano)
- Stock data: 5000 NASDAQ stocks generated deterministically (seed 42), ~320 real tickers prioritized, cached in memory at startup
- Rate limiting on AI endpoints: 10 requests/minute per IP
- CORS enabled, JSON limit 10mb

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
