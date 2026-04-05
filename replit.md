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
- Financial analysis platform with dark theme (black bg, electric blue #00D4FF, gold #FFD700)
- Pages: Landing (/), Dashboard (/dashboard), Options Signals (/options), About (/about)
- Tone: Honest, no-hype, no AI slop. Straightforward about what the platform does and doesn't do.
- Core concept: Multiple AI analysis methods (price action, volume, options flow, Greeks, sentiment, risk) run simultaneously and cross-check each other. Signals only fire on consensus.
- Features: Email waitlist, live scrolling market ticker, stock signals with confidence scores and reasoning notes, options flow alerts with context, Greeks table with IV rank and strategy labels, risk disclaimers on every data page
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
