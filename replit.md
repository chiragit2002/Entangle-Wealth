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

## Artifacts

### EntangleWealth (`artifacts/entangle-wealth`)
- Professional dark-themed stock and options alert web application
- Black background with electric blue (#00D4FF) and gold (#FFD700) accents
- Pages: Landing (/), Dashboard (/dashboard), Options Signals (/options), About (/about)
- **Quantum Orchestrator**: 300-agent AI swarm system powering all pages
  - Stock Market Mastery (Agents 201-230): Price action, volume profiles, VWAP, RSI, MACD, Fibonacci, Ichimoku, institutional order flow
  - Options Mastery (Agents 231-260): Greeks (Delta, Gamma, Theta, Vega), unusual options activity, spreads, smart money flow
  - Economic Survival (Agents 13-25): Income opportunity hunting, financial literacy, entrepreneurship, benefits navigation
  - Predictive Intelligence (Agents 39-52): Sentiment analysis, behavioral economics, black swan detection
  - Quantum Command / Hyperspeed Council (Agents 281-300): Flash council every 2 seconds, conflict resolution, consensus engine
  - 15 specialized divisions total, all operating under quantum entanglement principles
- Features: Email waitlist, live scrolling market ticker, stock alert cards with agent source attribution, options flow alerts with strategy labels, Greeks display, signal strength indicators, swarm status panel with toggle, flash council counter, agent status grid
- Centralized mock data in `src/lib/mock-data.ts` with `agentSwarmData` as single source of truth for agent counts/categories
- Frontend-only with mock data (no backend API calls)
- Mobile responsive with hamburger navigation
- Fonts: JetBrains Mono (data), Inter (UI)
- CSS utilities: `.electric-text` (blue gradient), `.gold-text` (gold gradient), `.glass-panel`
- Routing: wouter for client-side routing

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
