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
- **Authentication**: Clerk (auto-provisioned via Replit)
- **Payments**: Stripe (via Replit integration + stripe-replit-sync)
- **AI**: OpenAI via Replit AI Integrations proxy (`@workspace/integrations-openai-ai-server`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Clerk React

## Artifacts

### EntangleWealth (`artifacts/entangle-wealth`)
- Financial analysis platform with dark theme (black bg, electric blue #00D4FF, gold #FFD700)
- **Authentication**: Clerk (email + Google sign-in at /sign-in, /sign-up)
- Pages: Landing (/), Dashboard (/dashboard), Earn (/earn), Options Signals (/options), Stock Explorer (/stocks), Job Search (/jobs), Gig Marketplace (/gigs), Community (/community), Tax Dashboard (/tax), Receipt Scanner (/receipts), Business Travel Planner (/travel), TaxGPT (/taxgpt), Technical Analysis (/technical), Terminal (/terminal), Résumé Builder (/resume, auth required), Profile (/profile, auth required), About (/about)
- Tone: Honest, no-hype, no AI slop. Straightforward about what the platform does and doesn't do.
- Core concept: Multiple AI analysis methods run simultaneously and cross-check each other via "quantum entanglement." Signals only fire on consensus.
- Mission: Help everyday families make better financial decisions.

#### Stock Explorer (/stocks)
- 5,000 NASDAQ-listed stocks with searchable/filterable table
- Top Gainers, Top Losers, Sector Overview panels
- Click any stock for detail view with 52-week range bar, market data
- AI-powered "Quantum Entanglement Analysis" — 7 specialized agents analyze each stock via OpenAI
- Rate limited: 10 AI requests per minute per IP

#### Job Search (/jobs)
- Search jobs by keyword, location, type (full-time, part-time, gig, freelance, contract)
- Remote-only filter, pagination
- Save/bookmark jobs (requires sign-in)
- Falls back to demo listings when no JSearch API key configured

#### Résumé Builder (/resume, auth required)
- Step-by-step guided builder with collapsible sections
- Supports gig/freelance work (DoorDash, Uber, etc.) alongside traditional roles
- Live preview pane (updates as you type)
- 3 templates: Professional (blue accent), Modern (gold accent), Minimal (white accent)
- Export to PDF via browser print
- Save to database, auto-loads on return

#### Gig Marketplace (/gigs)
- Browse local service gigs with category filters (cleaning, outdoor, auto, moving)
- Search gigs by keyword
- Post gigs (requires sign-in) with title, price, category, description
- Mock gig data fallback when DB has few entries
- API: GET /api/gigs (list+filter), POST /api/gigs (create), DELETE /api/gigs/:id

#### Profile (/profile, auth required)
- User profile with headline, bio, contact info, photo
- Investment Progress stats: This Month earnings, Signals Used, Gig Earned, Max Risk
- Privacy Settings: Public Profile toggle (persisted to DB)
- KYC verification form (name, DOB, address, ID)
- Saved jobs list with remove
- Résumé preview card
- Subscription tier display (Free/Pro/Enterprise)

#### KYC Verification
- Multi-step form: personal info + government ID
- Status tracking: Not Started → Pending Review → Verified / Rejected
- Required before Stripe payment features

#### Stripe Payments
- Products: EntangleWealth Pro ($29/mo), Enterprise ($99/mo)
- Checkout via Stripe Checkout Sessions
- Customer portal for subscription management
- KYC gate — must verify identity before payment
- Webhook handler for payment events

#### Community (/community)
- 5-tab interface: Groups, Feed, Events, Jobs, Pricing
- Communities: 6 default groups (Options Flow Traders, Real Estate Investors, Tax Strategy Hub, Tech Builders, Gig Economy Workers, Crypto & DeFi) with category filters, join/leave, create modal
- Feed: post creation (1000 char limit), like/unlike, share, comment counts
- Events: event cards with RSVP, create event modal, filter by upcoming/virtual/in-person
- Jobs: job board with search + category filter, post job modal (adds to state list)
- Pricing: 3-tier cards (Starter Free, Pro $29/mo, Business $79/mo) with referral program
- All state is client-side (no backend for MVP)

#### TaxFlow Suite
- **Tax Dashboard (/tax)**: Compliance score ring (SVG), 4-stat grid (deductions found, missing, receipts logged, audit risk), missing deductions cards with IRS publication references and estimated values, "Add to Checklist" buttons, quick links to Receipts/Travel/TaxGPT
- **Receipt Scanner (/receipts)**: Upload zone + manual entry form (vendor, amount, IRS category, purpose, date), logged receipts list with deductibility badges and running totals, Export for CPA (CSV download with formula-injection-safe escaping), all client-side via localStorage (`entangle-receipts`), amount validation (0.01–999,999.99), maxLength on all inputs
- **Business Travel Planner (/travel)**: Professional 4-step wizard: (1) Google Flights-style trip planning with airport autocomplete (20 US airports), swap button, round trip/one way/multi-city, travelers, class, trip summary card; (2) IRS Deductions browser — 10 categorized deductions from 80,000+ IRS pages with search, expand/collapse details, IRS publication references, conditions; (3) Day-by-day itinerary builder with template generation, activity type dropdowns (business/meal/travel/networking/personal), deductibility badges, CPA notes; (4) Review & Export with compliance score ring, estimated deductible amount, deduction breakdown table, itinerary overview, CSV download, Send to CPA
- **TaxGPT (/taxgpt)**: AI chat powered by OpenAI (gpt-4o-mini via proxy), common questions quick buttons, audit risk factors section with progress bars, client-side fallback with keyword-matched IRS answers (10 topics) when API unavailable, client-side rate limiting (10 req/min sliding window), 1000-char input limit
- **Security**: CSV exports use formula-injection-safe `escapeCSV()` (prefixes `=+\-@\t\r` with `'`), all inputs have `maxLength`, server-side rate limiting on TaxGPT API (10 req/min per IP), all buttons 44px min-height for mobile touch targets, dark select option styling

#### Technical Analysis (/technical)
- Professional TradingView-inspired layout with 3-panel design: watchlist sidebar, main analysis, agent/indicator views
- 55+ technical indicators across 5 categories: Trend (SMA, EMA, WMA, DEMA, TEMA, HMA, KAMA, VWAP, Ichimoku, Parabolic SAR, Supertrend, ADX, Aroon, TRIX, DPO, Mass Index, Vortex), Momentum (RSI, MACD, Stochastic, Williams %R, CCI, ROC, MFI, CMO, UO, TSI, PPO, AO, Coppock, KST, Stoch RSI), Volatility (Bollinger, ATR, Keltner, Donchian, StdDev, HV, Chaikin Vol, Ulcer), Volume (OBV, A/D Line, CMF, Force Index, EMV, Vol RSI, Pivot Points, Fibonacci)
- Indicator library: `src/lib/indicators.ts` with `runAllIndicators(data)`, `getOverallSignal(results)`, `generateMockOHLCV(basePrice)`
- **Full stock search**: 130+ stocks (including RKLB/Rocket Lab, SOFI, RIVN, COIN, etc.) searchable by ticker or company name with sector labels; any typed ticker accepted
- **Persistent watchlist**: localStorage-backed (`entangle-watchlist`), add/remove stocks, AI auto-analyzes with signal + confidence, refresh all watchlist signals
- **Toggle views**: AI Agents view (6 agent cards) or Indicators view (sortable table with signal badges)
- 6 AI agent reviews: Trend Analyst, Momentum Surgeon, Risk Manager, Volume Profiler, Devil's Advocate, Consensus Engine
- Category filter tabs (All/Trend/Momentum/Volatility/Volume) with buy/sell counts
- Overall signal summary with confidence percentage
- Export all indicators to CSV (formula-injection safe)
- Race condition protection: `useRef` guards prevent stale analysis results from rapid searches

#### Dashboard (/dashboard) — Command Center
- **Full stock search**: 60+ stocks searchable by ticker or company name with dropdown autocomplete
- **Quick Analysis**: clicking a stock from search runs 55+ indicators and shows signal/confidence inline with "Full Analysis" link to /technical
- Stock Signals, Options Flow, Unusual Activity + Greeks sections
- Portfolio chart (1D/1W/1M/3M), Options Income chart, Fear/Greed, Sector Heatmap, Risk Radar
- WatchlistPanel + Live Analysis Feed + Signal History
- Race condition protection on quick analysis

#### Notification Center
- Bell icon in navbar (desktop and mobile) with unread count badge
- Dropdown with two tabs: Alerts (notification list) and Configure (alert setup)
- Mock notifications: buy/sell signals, price alerts, volume spikes, system messages
- Alert configuration: add alerts by symbol + type (price above/below, RSI oversold/overbought, MACD crossover, volume spike) + value
- Alerts persisted to localStorage (`entangle-alerts`)
- Toggle/delete configured alerts
- Mark all read, clear all actions
- Keyboard accessible: Escape to close, focus management, dialog role

#### Terminal (/terminal)
- MirofishTerminal with live order flow, news feed, system log panels
- Commands: HELP, QUOTE, ANALYZE (AI), SEARCH (API), RISK, STATUS, SIGNALS, PORTFOLIO, CLEAR

#### System Prompt (`src/lib/system-prompt.md`)
- Comprehensive AI assistant identity document with 70 professions across 11 thematic clusters
- Quantum entanglement metaphor as cross-disciplinary knowledge framework
- Behavioral instructions, feature-specific guidance, and operational directives
- Clusters: Financial Core, Technology & Engineering, Data & Intelligence, Security & Risk, Legal/Compliance, Design & Experience, Communication & Content, Career & Human Capital, Psychology & Decision Science, Operations & Product, Domain Specializations

#### Design System
- Fonts: JetBrains Mono (data), Inter (UI)
- CSS utilities: `.electric-text` (blue gradient), `.gold-text` (gold gradient), `.glass-panel`
- Routing: wouter for client-side routing
- Mobile responsive with hamburger navigation + bottom navigation bar (Home, Signals, Analysis, Gigs, TaxFlow) on screens < 1024px
- Dashboard includes enhanced Options Flow with Greeks display (delta, gamma, theta, IV rank) and unusual activity flags

### API Server (`artifacts/api-server`)
- Express 5 on port defined by PORT env var
- **Auth**: Clerk middleware (clerkMiddleware + requireAuth for protected routes)
- **Stripe**: Webhook endpoint registered before body parsers, auto-init on startup
- Routes:
  - `GET /api/health` — health check
  - **Stocks**: GET /api/stocks, /api/stocks/movers, /api/stocks/sectors, /api/stocks/:symbol
  - **AI Analysis**: POST /api/stocks/:symbol/analyze, /api/stocks/:symbol/quick-analyze (rate-limited)
  - **Users**: GET /api/users/me, POST /api/users/sync, PUT /api/users/me, GET /api/users/:userId/profile
  - **Résumés**: GET/POST /api/resumes, GET/PUT/DELETE /api/resumes/:id, GET /api/resumes/public/:userId
  - **Jobs**: GET /api/jobs/search, GET /api/jobs/saved, POST /api/jobs/save, DELETE /api/jobs/saved/:id
  - **KYC**: GET /api/kyc/status, POST /api/kyc/submit, POST /api/kyc/approve/:userId
  - **Stripe**: GET /api/stripe/config, GET /api/stripe/products, POST /api/stripe/create-checkout, GET /api/stripe/subscription, POST /api/stripe/create-portal
  - **TaxGPT**: POST /api/taxgpt (OpenAI-powered tax Q&A, gpt-4o-mini, temp 0.3, server-side rate limit 10/min per IP)

## Database Schema

### users
- id, clerk_id, email, first_name, last_name, photo_url, headline, bio, phone, location
- stripe_customer_id, stripe_subscription_id, subscription_tier
- kyc_status (not_started | pending_review | verified | rejected), kyc_submitted_at, kyc_verified_at
- is_public_profile, created_at, updated_at

### resumes
- id, user_id, title, template, summary, skills (jsonb), certifications (jsonb)

### resume_experiences
- id, resume_id, company, title, location, start_date, end_date, is_current, description, is_gig_work, sort_order

### resume_education
- id, resume_id, school, degree, field, start_date, end_date, sort_order

### saved_jobs
- id, user_id, job_title, company, location, salary, job_type, source_url, source, external_id, saved_at

### gigs
- id, user_id, title, description, price, category, contact_name, rating, completed_jobs, is_active, created_at

### stripe.* (auto-managed by stripe-replit-sync)
- products, prices, customers, subscriptions, payment_intents, etc.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts exec tsx src/seed-products.ts` — seed Stripe products

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
