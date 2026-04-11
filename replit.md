# Overview

EntangleWealth is a pnpm monorepo financial analysis platform designed to help families make better financial decisions. It offers tools for stock analysis, job searching, résumé building, gig marketplaces, and a comprehensive TaxFlow suite. The platform features a "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals, aiming to provide honest and practical financial insights.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## UI/UX and Design System
- **Theme**: Dark theme with black background, electric blue (`#00D4FF`), gold (`#FFD700`), and tertiary purple (`#9c27b0`) accents.
- **Typography**: JetBrains Mono for data displays and Inter for UI elements.
- **Visuals**: Glassmorphism effects, blurred panels, gradient borders, custom scrollbars, and animations.
- **Navigation**: Navbar with dropdown groups and a mobile-responsive bottom navigation bar.
- **Components**: Utilizes shadcn/ui.
- **Layout Background**: Animated gradient orbs and a subtle dot grid overlay.
- **Core Features**: Competitive intelligence, AI-powered résumé builder, open-source intelligence with GitHub integration, and professional charting capabilities with AI scanning.

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
- **Security**: Helmet for HTTP security headers, global and AI-specific rate limiting.
- **Performance**: Paginated endpoints, database indexing, AI request queuing, exponential backoff with jitter, circuit breaker patterns, image compression, and real-time metrics.

## Feature Specifications
- **EntangleWealth Platform**:
    - **AI Analysis**: "Quantum Entanglement Analysis" using 7 specialized AI agents for consensus-based stock signals.
    - **Financial Tools**: Stock Explorer, Job Search, Résumé Builder, Gig Marketplace.
    - **User Management**: Profile management, KYC verification, Stripe payments, gamification, and leaderboard engine.
    - **Community**: Groups, Feed, Events, Jobs, Pricing.
    - **TaxFlow Intelligence Platform**: Core data layer with IRS tax rates, 27 strategies, onboarding wizard (4-step: entity selection, business info with EIN + KYC verification, income profile with business trip deductions, goals with filing time), tax dashboard, strategy browser, document vault with AI analysis, TaxGPT, travel budget planner, and legal disclaimers. UserProfile includes `ein`, `businessTripDeductions[]`, and `kyc` fields. KYC PII is submitted to backend `/kyc/submit` and sensitive fields (ID number, DOB) are stripped from localStorage after submission.
    - **Paper Trading**: $100K starting cash paper trading system. Users start at $0 portfolio value until they place trades. Buy/sell stocks at specified prices, track positions, P&L, and trade history. Reset to $100K available. Backend tables: `paper_portfolios`, `paper_trades`, `paper_positions`. Floating paper trading widget available on all trading pages (Options, Charts, Technical Analysis, Terminal, Stocks).
    - **Gamification System**: XP/Level/Tier progression (Bronze→Diamond), daily streak with multiplier (up to 3x), 12+ badges, daily/weekly challenges, leaderboard (weekly/monthly/all-time), EntangleCoin token rewards. **Daily Spin Wheel** with weighted XP rewards (100-1000 XP), streak shields, and 2x multiplier boosters. 24h cooldown enforced server-side. **Founder Status** for early users with permanent 1.5x XP multiplier. **Gamification Widget** on Dashboard showing level, XP, streak, badges, and daily spin trigger. Backend tables: `user_xp`, `xp_transactions`, `badges`, `user_badges`, `challenges`, `user_challenges`, `streaks`, `leaderboard_snapshots`, `daily_spins`, `founder_status`.
    - **Market Analysis**: Technical Analysis (TradingView-inspired), Market Overview, Stock Screener, Dashboard (Bloomberg-style Command Center), Options Chain, "What If" Time Machine, Sector Flow Radar, Volatility Lab.
    - **Alternate Timeline Mode** (`/alternate-timeline`): Dual-pane comparison interface for financial futures. Features: side-by-side "Current Path" vs "Better Path" with real-time sliders (income, savings rate, debt, investment rate, net worth, emergency fund), animated chart showing both paths, Decision Impact Layer (delta at 7 horizons: 30d/90d/180d/1yr/5yr/10yr/20yr), milestone markers (Emergency Fund Built, Debt-Free, Investment Compounding Phase, Financial Flexibility Achieved), psychological contrast engine with stability/stress/opportunity scores, Regret-Free Exploration Mode, identity-based progression (Aware→Experimenting→Building→Strategic), Snapshot Compare (save/annotate/load scenarios), XP rewards for simulations/saves/comparisons. Backend tables: `timelines`, `timeline_results`, `timeline_comparisons`, `user_identity_stages`. API: POST `/api/timeline/simulate`, POST `/api/timeline/save`, GET `/api/timeline/saved`, GET `/api/timeline/:id`, DELETE `/api/timeline/:id`, POST `/api/timeline/compare`, GET `/api/timeline/identity/me`.
    - **Alerts & Notifications**: Real-time SSE-powered notification center, web push notifications (VAPID/service worker), and a full-stack alert engine with server-side evaluation. Push subscriptions stored in `push_subscriptions` table. Backend uses `web-push` package.
    - **Terminal**: Bloomberg-style Analysis Terminal with multi-panel interface and command support.
    - **Research/News**: Live news intelligence with scraping, sentiment analysis, and caching.
    - **Legal**: Comprehensive legal pages (Terms, Privacy, Disclaimers, etc.).
    - **Support System**: Help Center, ticket submission, system status page.
    - **Admin Tools**: Launch Readiness checks, Scalability Dashboard.
    - **EntangleCoin Token System**: ERC-20 token wallet, transaction history, travel marketplace, reward system, and admin controls.
    - **AI Marketing Command Center**: Admin-only platform for AI-generated marketing content across various social media and content types.
    - **Content Calendar**: Admin-only tool for scheduling and tracking AI-generated content.
    - **SEO Engine**: Admin-only tool for keyword tracking, blog post editing with AI generation, meta tag management, and backlink tracking.
    - **GitHub Solution Finder**: Standalone GitHub intelligence platform using REST/GraphQL APIs and Claude AI analysis.
    - **Mobile Design**: Fully responsive, mobile-first design with bottom navigation.

## API Server
- **Security**: Helmet, global and AI-specific rate limits, CSRF protection (blocks missing Origin on mutations), CORS restricted to known Replit/localhost origins.
- **Authentication**: All AI endpoints (analyze, taxgpt, document-analyze), news/refresh, and Alpaca routes require `requireAuth` middleware. Centralized `requireAdmin` middleware for admin routes (KYC approve, token admin, support admin, analytics dashboard, status admin).
- **Health Endpoint**: Public `/health` and `/healthz` return minimal `{status, timestamp}` only. Detailed operational data at `/health/detailed` behind auth.
- **Integrations**: Stripe webhook endpoint, Zapier webhook integration for platform events.
- **Data Proxies**: Alpaca Markets API proxy with circuit breaker and exponential backoff.
- **News Intelligence**: `/api/news` endpoint with RSS scraping, sentiment analysis, and caching. `/api/news/refresh` requires auth.
- **Performance**: Metrics middleware, AI request queuing, circuit breakers for external APIs, image compression.
- **Routes**: Comprehensive API routes for all platform features including stock data, AI analysis, user management, KYC, payments, tax, gamification, token system, marketing, and support.

# External Dependencies

- **Monorepo tool**: pnpm workspaces
- **API framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **AI**: OpenAI (via Replit AI Integrations proxy), Anthropic Claude (via Replit AI Integrations proxy)
- **Validation**: Zod
- **Build**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Clerk React, react-error-boundary
- **Charts**: TradingView Lightweight Charts
- **Maps**: Leaflet.js with OpenStreetMap tiles and Nominatim geocoding
- **Market Data**: Alpaca Markets API
- **Client-side Routing**: wouter