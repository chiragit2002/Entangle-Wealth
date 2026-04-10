# Overview

EntangleWealth is a pnpm workspace monorepo using TypeScript, designed as a financial analysis platform. Its core mission is to help everyday families make better financial decisions by providing tools for stock analysis, job search, résumé building, gig marketplaces, and a comprehensive TaxFlow suite for tax management. The platform features a unique "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals. It integrates with Clerk for authentication, Stripe for payments, and OpenAI for AI capabilities. The platform aims to be honest and straightforward, avoiding hype or AI slop, and focuses on practical financial tools.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## Monorepo Structure
The project is a pnpm workspace monorepo with each package managing its own dependencies.

## UI/UX and Design System
- **Theme**: Dark theme with a black background, electric blue (`#00D4FF`), and gold (`#FFD700`) accents. Purple (`#9c27b0`) as tertiary accent.
- **Fonts**: JetBrains Mono for data displays and Inter for UI elements.
- **CSS Utilities**: Includes `.electric-text`, `.gold-text`, `.glass-panel`, `.glass-panel-gold`, `.mobile-card`, `.mobile-card-glow`, `.signal-card`, `.filter-pill` for consistent styling.
- **Glassmorphism**: All panels use `blur(20px) saturate(1.2)` with gradient border overlays (cyan-to-gold) and hover effects (border glow + shadow lift).
- **Scrollbar**: Custom styled with 6px width, transparent track, cyan hover thumb.
- **Animations**: `orb-drift-1/2/3` for background mesh, `fade-up` for page transitions, `border-shimmer` for gradient borders, plus existing `pulse-glow`, `float`, `shimmer`, `rotate-slow`.
- **Navbar**: Organized into dropdown groups (Trading, Tools, Research, More) with animated gradient bottom border. Logo uses `Entangle<span class="text-primary">Wealth</span>` treatment.
- **Routing**: `wouter` for client-side routing.
- **Responsiveness**: Mobile-responsive design with grouped hamburger menu (section headers: Trading, Tools, Research, More in 2-column grid) and bottom navigation bar on screens smaller than 1024px.
- **Components**: Utilizes shadcn/ui components.
- **Layout Background**: Three animated gradient orbs (cyan, gold, purple) with slow drift animations, plus a subtle dot grid overlay at 40px spacing.
- **Competitive Intelligence**: `/competitive-intel` — Full quantum competitive analysis report with 7 competitors (Bloomberg, TradingView, Koyfin, Trade Ideas, TrendSpider, Danelfin, Robinhood), April Dunford positioning, feature matrix, 2x2 positioning map, Kano analysis, strategic action plan, and PDF export via jsPDF.
- **Résumé Builder**: `/resume` (protected) — Quantum Résumé Entanglement Engine with three tabs: Resume Builder (5 templates, live preview, contact/summary/experience/education/skills/certifications sections), LinkedIn Import (URL-based profile import with AI enhancement), and Accounting Software Integration (QuickBooks, Xero, H&R Block connection cards for financial data entanglement). Includes Quantum Coherence Score (completion %) and gig/freelance work tagging.
- **Open Source Intel**: `/open-source-intel` — GitHub Solution Entanglement Map showing 14 battle-tested open-source libraries (TradingView Lightweight Charts, Alpaca TypeScript SDK, TanStack Table, @react-pdf/renderer, Sonner, tsParticles, zustand, etc.) with priority filtering (Critical/High/Medium/Explore), category filtering, expandable details, install commands, license compliance matrix, and 3-phase integration strategy.

## Technical Implementations
- **Authentication**: Clerk for user authentication (email and Google sign-in).
- **Database**: PostgreSQL with Drizzle ORM for data management.
- **API**: Express 5 server handling all backend logic and API endpoints.
- **AI Integration**: OpenAI via Replit AI Integrations proxy, specifically `gpt-4o-mini` for features like TaxGPT and "Quantum Entanglement Analysis".
- **Validation**: Zod for schema validation.
- **Build**: `esbuild` for CJS bundle creation.
- **Frontend**: React with Vite, styled using Tailwind CSS.
- **Payments**: Stripe for subscription management and payment processing. KYC verification is a prerequisite for Stripe payment features.
- **Data Management**: LocalStorage is used for client-side persistence of items like watchlist, alerts, and receipts.

## Feature Specifications

### EntangleWealth (`artifacts/entangle-wealth`)
- **Core AI Analysis**: "Quantum Entanglement Analysis" uses 7 specialized AI agents to analyze stocks, providing signals only on consensus. Rate-limited to 10 AI requests per minute per IP.
- **Stock Explorer**: Displays 5,000 NASDAQ stocks with search, filter, Top Gainers/Losers, and detailed views.
- **Job Search**: Searchable job listings with filters, pagination, and job saving (requires sign-in). Fallback to demo listings if JSearch API is not configured.
- **Résumé Builder**: Step-by-step guided builder with live preview, supporting traditional and gig work, and 3 customizable templates. Exports to PDF.
- **Gig Marketplace**: Browse and post local service gigs with categories and search.
- **Profile**: User profile management, investment progress stats, privacy settings, and KYC verification.
- **KYC Verification**: Multi-step form for personal info and government ID, with status tracking.
- **Stripe Payments**: Integration for subscription products (Pro, Enterprise) with checkout sessions and a customer portal. KYC is required before payment.
- **Community**: 5-tab interface (Groups, Feed, Events, Jobs, Pricing) with client-side state for MVP.
- **TaxFlow Suite**:
    - **Tax Dashboard**: Compliance score, deduction tracking, and quick links.
    - **Receipt Scanner**: Upload and manual entry for receipts, with deductibility badges and CSV export. Client-side storage via `localStorage`.
    - **Travel Budget Planner** (`/travel`): Dual-mode planner with Personal Trip and Business Trip modes. Personal Trip: origin/destination form, interactive Leaflet.js map (OpenStreetMap + Nominatim geocoding) with color-coded markers, day-by-day itinerary builder with per-item costs, budget summary dashboard with category breakdown and "trip cost vs. savings" widget, entry requirements alerts (visa, passport, vaccines, ETIAS) with official source links. Business Trip: preserved 4-step wizard for IRS deduction tracking, itinerary building, and CSV export with compliance scoring.
    - **TaxGPT**: AI chat for tax Q&A (gpt-4o-mini), with quick buttons and client-side fallback/rate limiting.
- **Technical Analysis**: TradingView-inspired layout with 55+ technical indicators, full stock search, persistent watchlist, and candlestick charts with overlays. Features 6 AI agent reviews.
- **Market Overview**: Dashboard for major indices, economic indicators, sector heatmaps, global markets, and market breadth.
- **Stock Screener**: Filterable and sortable stock list with AI signal and confidence.
- **Dashboard**: Bloomberg-style Command Center with 8-stat header bar (Portfolio, Options P&L, Win Rate, Risk Level, VIX, TICK, A/D Ratio, P/C Ratio), Quantum Entanglement Matrix, Market Internals panel (14 breadth indicators), Multi-Asset panel (Crypto/Forex/Commodities/Bonds tabs), Fear & Greed gauge, Watchlist, AI Model Feed, Stock Signals table, Options Flow table, Greeks table, Signal History, Economic Calendar, and keyboard shortcuts (press ? for shortcuts, / for search, 1-7 for page navigation via SPA routing).
- **Notification Center**: In-app alerts for signals, price alerts, and system messages, with configurable alert settings.
- **Options**: Detailed options chain with Greeks, expiration dates, and unusual options activity tables.
- **Terminal**: Bloomberg-style Analysis Terminal v3.0 with MiroFish multi-panel terminal (Order Flow, News Feed, System Log, Command Interface), Position Calculator, P&L Simulator, Signal History, and Risk Radar. Supports commands: QUOTE, ANALYZE (AI), SEARCH, NEWS, RISK, STATUS, SIGNALS, PORTFOLIO. All wrapped in professional tiled Bloomberg-style panels with colored left-border headers.
- **Research / News Intelligence** (`/research`): MiroFish-powered live news intelligence page. Scrapes 15 RSS feeds (EE Times, Semiconductor Engineering, BBC, Al Jazeera, CNN, The Verge, Ars Technica, Supply Chain Dive, Tom's Hardware, Yahoo Finance, CNBC, TechCrunch, NPR, FreightWaves) across 5 categories (Microelectronics, Geopolitics, Supply Chain, Tech Policy, Markets). Features 35+ keyword relevance scoring, sentiment analysis, stock ticker detection with cross-links, category filtering tabs, search, expandable article summaries, and 5-minute server-side cache. SSRF protection covers all private/link-local/loopback ranges (IPv4+IPv6).
- **"What If" Time Machine** (`/time-machine`): Historical investment simulator using real Alpaca market data. Enter any stock symbol, start date, and dollar amount to see what your investment would be worth today. Features interactive journey chart with investment baseline, stats for total return, annualized return, max drawdown, best/worst days, and share count. Quick-pick presets for popular scenarios (NVDA Jan 2020, AMD COVID Bottom, etc.).
- **Sector Flow Radar** (`/sector-flow`): Real-time sector rotation visualization tracking 80 stocks across 8 sectors (Technology, Healthcare, Consumer Cyclical, Financials, Energy, Industrials, Comm Services, Real Estate). Features animated radar chart showing relative sector momentum, market regime indicator (Risk-On/Risk-Off/Neutral), sector breakdown cards with gainers/losers bars, volume data, and top/worst movers per sector. Uses live Alpaca snapshots.
- **Volatility Lab** (`/volatility`): Multi-timeframe realized volatility analysis with institutional-grade risk metrics. Computes annualized vol at 5 timeframes (1W, 1M, 3M, 6M, 1Y) using log returns. Features vol term structure chart, daily return distribution histogram, vol regime detection (Low/Normal/Elevated/Extreme), and risk ratios: Sharpe, Sortino, Calmar, max drawdown. Quick-pick buttons for popular symbols.

- **Pricing** (`/pricing`): 3-tier pricing page (Starter $0, Pro $29/mo, Business $79/mo) with feature comparison, free trial CTA, and referral program section.
- **Terms of Use** (`/terms`): Full legal terms covering acceptance, service description, financial advice disclaimer, market data & third-party services (Alpaca), user accounts, subscriptions, AI analysis disclosure, prohibited uses, IP, liability, risk disclosure, indemnification, and governing law.
- **Privacy Policy** (`/privacy`): Comprehensive privacy policy covering data collection, usage, sharing, security, retention, user rights (CCPA), international transfers, and children's privacy.
- **Mobile Design**: Fully responsive mobile-first design with bottom navigation (Home, Signals, Analysis, TaxFlow, Pricing), signal cards with confidence bars and indicator panels, quantum entanglement matrix canvas, live ticker tape, and mobile-optimized card components.

## API Server (`artifacts/api-server`)
- Express 5 server with Clerk middleware for authentication.
- **Security**: Helmet for HTTP security headers (CSP disabled for SPA compatibility). Global rate limit of 120 req/min with `express-rate-limit` (skips Clerk proxy and Stripe webhooks). AI-specific rate limit of 15 req/min on `/api/taxgpt` and `/api/analyze`.
- Stripe webhook endpoint for payment events.
- **Alpaca Market Data**: Proxy routes to Alpaca Markets API for real-time stock snapshots, historical OHLCV bars, quotes, trades, and market movers. Endpoints: `/api/alpaca/snapshot/:symbol`, `/api/alpaca/snapshots`, `/api/alpaca/bars/:symbol`, `/api/alpaca/quote/:symbol`, `/api/alpaca/trades/:symbol`, `/api/alpaca/multibars`, `/api/alpaca/movers`, `/api/alpaca/account`. Uses IEX feed. Falls back to mock data on auth errors.
- **News Intelligence**: `/api/news` endpoint with RSS feed scraping via `rss-parser`, relevance scoring (35+ keywords), sentiment analysis, ticker extraction, category filtering, search, pagination, and 5-min cache. `/api/news/refresh` for manual cache invalidation. Rate-limited to 30 requests/min per IP.
- **Routes**: Health check, stocks data, AI analysis (rate-limited), user management, résumé operations, job search/save, KYC submission, Stripe configuration/checkout, TaxGPT queries, Alpaca market data proxy, and news intelligence.

# External Dependencies

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk (auto-provisioned via Replit)
- **Payments**: Stripe (via Replit integration + `stripe-replit-sync`)
- **AI**: OpenAI (via Replit AI Integrations proxy `@workspace/integrations-openai-ai-server`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Clerk React, react-error-boundary
- **Charts**: TradingView Lightweight Charts (candlestick/volume charts in Technical Analysis, reusable LightweightChart component)
- **Maps**: Leaflet.js with OpenStreetMap tiles and Nominatim geocoding (Travel Budget Planner)
- **Market Data**: Alpaca Markets API (paper trading keys, IEX feed)
- **Client-side Routing**: wouter