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
- Features: Email waitlist capture, live scrolling market ticker, stock alert cards, options flow alerts, Greeks display, signal strength indicators
- Frontend-only with mock data (no backend API calls)
- Mobile responsive with hamburger navigation
- Fonts: JetBrains Mono (data), Inter (UI)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
