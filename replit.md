# Overview

EntangleWealth is a pnpm monorepo financial analysis platform designed to help families make better financial decisions. It offers tools for stock analysis, job searching, résumé building, gig marketplaces, and a comprehensive TaxFlow suite. The platform features a "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals, aiming to provide honest and practical financial insights. The project's ambition is to provide competitive intelligence, AI-powered résumé building, open-source intelligence with GitHub integration, and professional charting capabilities with AI scanning.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## UI/UX and Design System
- **Theme**: Light/dark mode toggle (default dark) with electric blue, gold, and purple accents for dark mode; primary `#0099CC` for light mode. Utilizes `next-themes` and CSS variables.
- **Typography**: JetBrains Mono for data displays and Inter for UI elements.
- **Visuals**: Glassmorphism effects, blurred panels, gradient borders, custom scrollbars, and animations. Animated gradient orbs and a subtle dot grid overlay for background.
- **Navigation**: Navbar with 5 flat links (Dashboard, Stocks, Tax, Leaderboard, Pricing) + Admin link for admin users. Mobile bottom nav with same 5 core items. No dropdowns, no boot sequence, no page transition animations, no profile completion gate overlay.
- **Components**: Utilizes shadcn/ui.
- **Auth Pages**: Bloomberg Terminal-grade sign-in/sign-up using `TerminalAuthShell` component (`src/components/TerminalAuthShell.tsx`). Dark navy (#0A0E1A) background, live scrolling ticker tape, split layout: left = brand panel with market stats + terminal status lines, right = Clerk auth form. Green terminal accent (#00FF41), monospace font, no boot sequence on auth pages. Clerk appearance customized in `App.tsx` (`clerkAppearanceDark`).

## Technical Implementations
- **Monorepo**: pnpm workspace structure.
- **Authentication**: Clerk.
- **Database**: PostgreSQL with Drizzle ORM.
- **API**: Express 5 server.
- **AI Integration**: OpenAI (`gpt-4o-mini`) and Anthropic Claude via Replit AI Integrations proxy.
- **Validation**: Zod.
- **Build**: `esbuild`.
- **Frontend**: React with Vite and Tailwind CSS.
- **Payments**: Stripe for subscriptions and KYC verification.
- **Data Management**: LocalStorage for client-side persistence.
- **Occupation System**: Structured occupations for tax category mappings and AI context.
- **Security**: Helmet for HTTP security headers, global and AI-specific rate limiting, CSRF protection. BoundedRateLimitMap/CooldownMap/TimestampMap utilities (`api-server/src/lib/boundedMap.ts`) replace all raw Maps for rate limiting with automatic TTL cleanup and max-size caps. AI input sanitizer unifies XSS and SQL injection patterns. News fetcher uses domain allowlist plus DNS resolution validation (blocks private IPs) for SSRF protection. XP cooldowns use in-memory cache with DB-backed fallback (survives restarts). Skip-to-content link and ARIA landmarks on all pages.
- **Account Management**: Users can export all their data (GET `/api/users/me/export`) and delete their account (DELETE `/api/users/me` with confirmation string). Deletion cascades to all related tables. UI in Profile page under "Data & Account" section.
- **Webhook Security**: Stripe webhook idempotency via `webhook_events` table dedup check. Helper functions throw on failure with read-back verification.
- **Freemium Gating**: High-value features require sign-in, while browsable content remains public.
- **Schema Management**: Drizzle ORM schema is the source of truth, with dev DB synced via `push-force`.
- **Performance**: Paginated endpoints, database indexing, AI request queuing, exponential backoff with jitter, circuit breaker patterns, image compression, real-time metrics.

## Feature Specifications
- **AI Analysis**: "Quantum Entanglement Analysis" using 7 specialized AI agents for consensus-based stock signals.
- **Financial Tools**: Stock Explorer, Job Search, Résumé Builder, Gig Marketplace, Market Analysis (Technical Analysis, Market Overview, Stock Screener, Dashboard, Options Chain, Time Machine, Sector Flow Radar, Volatility Lab), Paper Trading with options.
- **User Management**: Profile management, KYC verification, Stripe payments, gamification, and leaderboard engine.
- **Community**: Groups, Feed, Events, Jobs, Pricing.
- **TaxFlow Intelligence Platform**: Core data layer with IRS tax rates, 27 strategies, onboarding wizard, tax dashboard, strategy browser, document vault with AI analysis, TaxGPT, travel budget planner. Includes Receipt Capture System and Accounting Integrations.
- **Alternate Timeline Mode**: Dual-pane comparison interface for financial futures with real-time sliders, animated charts, and decision impact layers.
- **Alerts & Notifications**: Real-time SSE-powered notification center, web push notifications, and a full-stack alert engine.
- **Terminal**: Bloomberg-style Analysis Terminal (Mirofish) with multi-panel interface and command support. Integrated TaxFlow engine provides real-time tax impact analysis on every BUY/SELL command using FIFO/LIFO lot matching, wash sale detection (±30 day window), YTD tax summary, end-of-year projection, tax optimization per symbol, tax-loss harvesting scanner, and CSV export. Commands: TAX SUMMARY, TAX PROJECTION, TAX OPTIMIZE, HARVEST, EXPORT TAX REPORT, SET BRACKET, SET STATE, SET LOT METHOD, HIDE/SHOW TAX. Backend: `/api/taxflow/*` routes in `taxflow.ts`. Tax settings persist in localStorage.
- **Research/News**: Live news intelligence with scraping, sentiment analysis, and caching.
- **Legal**: Comprehensive legal pages.
- **Support System**: Help Center, ticket submission, system status page.
- **User Feedback System**: Lightweight floating feedback widget for logged-in users.
- **Analytics Pipeline**: `trackEvent` and page-view tracking, with key feature interactions instrumented.
- **Admin Tools**: Consolidated under `/admin` hub page. Active tools: Token Admin, Marketing AI, Analytics, Support Tickets, Launch Readiness, Sentry Monitoring, Audit Dashboard, Scalability, KYC Review, Status Page. Non-core pages (life simulator, Reddit/SEO engines, habits, giveaway, etc.) archived behind admin hub.
- **EntangleCoin Token System**: ERC-20 token wallet, transaction history, reward system.
- **GitHub Solution Finder**: Standalone GitHub intelligence platform using REST/GraphQL APIs and Claude AI analysis.
- **Mobile Design**: Fully responsive, mobile-first design with bottom navigation.

## API Server
- **Security**: Helmet, global and AI-specific rate limits, CSRF protection, CORS restricted.
- **Authentication**: `requireAuth` middleware for AI, news, and Alpaca routes; `requireAdmin` for admin routes.
- **Health Endpoint**: Public `/health` and `/healthz`, detailed `/health/detailed` behind auth.
- **Integrations**: Stripe webhook endpoint, Zapier webhook.
- **Data Proxies**: Alpaca Markets API proxy with circuit breaker and exponential backoff.
- **News Intelligence**: `/api/news` endpoint with RSS scraping, sentiment analysis, caching.
- **Performance**: Metrics middleware, AI request queuing, circuit breakers for external APIs, image compression.
- **Routes**: Comprehensive API routes for all platform features.

## Agent Orchestration Framework (`artifacts/api-server/src/lib/agents/`)
- **BaseAgent**: Abstract class with `init/start/stop/handleEvent/healthCheck` lifecycle, heartbeat tracking, error counting, and DB-backed audit logging to `agent_logs` table.
- **EventBus**: In-process typed pub/sub system. All events are persisted to `agent_events` table for full audit trail. Agents subscribe by event type; handlers run in parallel with isolated error handling.
- **AgentRegistry**: Manages 13 registered agents. Starts/stops all in sequence, runs periodic heartbeat health checks, auto-restarts failed agents (up to 3 attempts).
- **13 Agents**:
  - `AlertEvaluator` — wraps alert evaluation engine
  - `EmailDigest` — wraps daily/weekly digest scheduler
  - `DailyContent` — wraps AI social content generator
  - `DripEmail` — wraps drip email sequence scheduler
  - `ApiHealth` — wraps endpoint health monitor
  - `CrawlScheduler` — wraps automated site crawl scheduler
  - `Portfolio` — recalculates holdings/P&L on `trade_executed` and `price_update` events; emits `portfolio_updated`
  - `Risk` — evaluates concentration/cash risk on `portfolio_updated`; emits `risk_assessed`
  - `Tax` — checks wash sale rules and estimates tax impact on `trade_executed`; emits `tax_assessed`
  - `Strategy` — evaluates RSI/MACD/Bollinger signals on `price_update`; emits `strategy_signal`
  - `UserProfile` — selects top 4 dashboard modules based on occupation/business status on `user_session`; emits `dashboard_configured`
  - `Sync` — checks portfolio data consistency after trades and portfolio updates; emits `sync_discrepancy`
  - `Recovery` — monitors all agent heartbeats, logs unhealthy agents every 2 minutes
- **Event Chain**: Paper trading → `trade_executed` → Portfolio + Tax + Sync agents → `portfolio_updated` → Risk agent → `risk_assessed`
- **Database Tables**: `agent_logs` (every action/error with metadata) and `agent_events` (every published event with subscribers). Auto-created on startup if not present.
- **Status API**: `GET /api/agents/status` (admin-only) returns live health per agent with green/yellow/red indicators. Also `GET /api/agents/logs` and `GET /api/agents/events`.
- **Frontend**: `SystemStatus` component in Navbar (admin-only) shows real-time colored dot + tooltip with per-agent breakdown. Polls every 60 seconds.

# External Dependencies

- **Monorepo tool**: pnpm workspaces
- **API framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **AI**: OpenAI, Anthropic Claude
- **Validation**: Zod
- **Build**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Clerk React, react-error-boundary
- **Charts**: TradingView Lightweight Charts
- **Maps**: Leaflet.js with OpenStreetMap tiles and Nominatim geocoding
- **Market Data**: Alpaca Markets API
- **Client-side Routing**: wouter
- **Error Monitoring**: Sentry (@sentry/react, @sentry/node)