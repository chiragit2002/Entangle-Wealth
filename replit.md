# Overview

EntangleWealth is a pnpm monorepo financial analysis platform designed to help families make better financial decisions. It offers tools for stock analysis, job searching, résumé building, gig marketplaces, and a comprehensive TaxFlow suite. The platform features a "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals, aiming to provide honest and practical financial insights.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## Monorepo Structure
The project uses a pnpm workspace monorepo, with each package managing its own dependencies.

## UI/UX and Design System
- **Theme**: Dark theme with black background, electric blue (`#00D4FF`), gold (`#FFD700`), and tertiary purple (`#9c27b0`) accents.
- **Typography**: JetBrains Mono for data displays and Inter for UI elements.
- **Visuals**: Glassmorphism effects with blurred panels and gradient borders. Custom scrollbars and a variety of animations for background elements and transitions.
- **Navigation**: Navbar with dropdown groups (Trading, Tools, Research, Compete, EntangleCoin, More) and a mobile-responsive bottom navigation bar.
- **Components**: Utilizes shadcn/ui.
- **Layout Background**: Animated gradient orbs and a subtle dot grid overlay.
- **Core Features**:
    - **Competitive Intelligence**: Full quantum competitive analysis with positioning, feature matrix, and PDF export.
    - **Résumé Builder**: Quantum Résumé Entanglement Engine with templates, LinkedIn import, accounting software integration, and a Quantum Coherence Score.
    - **Open Source Intel**: GitHub Solution Entanglement Map showcasing battle-tested open-source libraries with integration strategies.
    - **TradingView Charts**: Professional charting platform with HTML5 candlestick engine, 40+ technical indicators, AI scanner, pattern detection, drawing tools, and price alerts.

## Technical Implementations
- **Authentication**: Clerk for user authentication (email, Google).
- **Database**: PostgreSQL with Drizzle ORM.
- **API**: Express 5 server handling backend logic.
- **AI Integration**: OpenAI via Replit AI Integrations proxy, using `gpt-4o-mini`.
- **Validation**: Zod for schema validation.
- **Build**: `esbuild` for CJS bundle creation.
- **Frontend**: React with Vite and Tailwind CSS.
- **Payments**: Stripe for subscriptions and payment processing, requiring KYC verification.
- **Data Management**: LocalStorage for client-side persistence of user-specific data.

## Feature Specifications

### EntangleWealth (`artifacts/entangle-wealth`)
- **Core AI Analysis**: "Quantum Entanglement Analysis" uses 7 specialized AI agents to analyze stocks, providing signals only on consensus. Rate-limited to 10 AI requests per minute per IP.
- **Stock Explorer**: Displays 5,000 NASDAQ stocks with search, filter, Top Gainers/Losers, and detailed views.
- **Job Search**: Searchable job listings with filters, pagination, and job saving (requires sign-in). Fallback to demo listings if JSearch API is not configured.
- **Résumé Builder**: Step-by-step guided builder with live preview, supporting traditional and gig work, and 3 customizable templates. Exports to PDF.
- **Gig Marketplace**: Browse and post local service gigs with categories and search.
- **Profile**: User profile management, investment progress stats, privacy settings, KYC verification, and gamification stats (level, XP, streak, rank, badges).
- **Gamification & Leaderboard Engine**: Full competitive gamification system with tiered levels (Bronze → Silver → Gold → Platinum → Diamond), XP system with server-controlled rewards, achievement badges (12 badges across 5 categories), daily/weekly challenges with progress tracking, streak tracking with multiplier bonuses (up to 3x), and a live leaderboard showing top 100 users with time-period filters.
- **KYC Verification**: Multi-step form for personal info and government ID, with status tracking.
- **Stripe Payments**: Integration for subscription products (Pro, Enterprise) with checkout sessions and a customer portal. KYC is required before payment.
- **Community**: 5-tab interface (Groups, Feed, Events, Jobs, Pricing) with client-side state for MVP.
- **TaxFlow Intelligence Platform**:
    - **Core Data Layer**: Shared types (`taxflow-types.ts`), IRS tax rate tables for 2024/2025/2026 (`taxflow-rates.ts`), 27 tax strategies engine (`taxflow-strategies.ts`), and localStorage profile management (`taxflow-profile.ts`).
    - **Onboarding Wizard**: 4-step modal (entity type → business info → deduction checklist → review) that creates a user tax profile in localStorage. Shows automatically on first visit to any TaxFlow page.
    - **Tax Year Selector**: Dropdown in navbar (2024–2026) that dispatches `taxflow-year-change` custom event; all TaxFlow pages listen and update accordingly.
    - **Tax Dashboard** (`/tax`): Compliance score ring, deduction category breakdown (pie chart), missed opportunity alerts, side-by-side tax estimator (Federal + SE + State), CPA report text export, and CSV deduction export. Visual identity: green (#00e676) for deductions, amber (#ffb800) for warnings, red (#ff4757) for tax owed, purple (#9c27b0) for AI.
    - **Tax Strategy Browser** (`/tax-strategy`): 27 filterable strategies by entity type (Contractor/LLC/S-Corp/C-Corp) and category (Retirement, Health, Equipment, etc.). Expandable cards with IRC references, risk badges, estimator functions, and "Add to Plan" / "Ask TaxGPT" actions. Plan strategies stored in localStorage.
    - **Document Vault** (`/receipts`): Drag-and-drop upload with AI document analysis (via `/api/analyze-document`), document cards and ledger view, category filters, mileage log module with per-entry tracking, and mileage CSV export.
    - **TaxGPT** (`/taxgpt`): Profile-aware AI tax assistant (gpt-4o-mini). Entity-specific quick chips, localStorage chat history persistence, profile context sent to backend for personalized answers.
    - **Travel Budget Planner** (`/travel`): Dual-mode planner with Personal Trip and Business Trip modes. Personal Trip: interactive Leaflet.js map with color-coded markers, day-by-day itinerary builder with per-item costs, budget summary dashboard. Business Trip: 4-step wizard for IRS deduction tracking, itinerary building, and CSV export with compliance scoring.
    - **Legal Disclaimers**: All TaxFlow pages include educational-only disclaimers advising users to consult a licensed CPA.
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
- **Legal**: Comprehensive Terms of Use and Privacy Policy.
- **EntangleCoin Token System**:
    - **Token Wallet** (`/wallet`): ENTGL balance display, Ethereum wallet linking (Sepolia testnet), transaction history, token valuation (25% of share price), supply info panel. Auth-protected.
    - **Travel Marketplace** (`/marketplace`): 12 luxury hotel/flight listings bookable with ENTGL tokens. Blockchain transaction receipts, mock inventory with rating/destination/pricing. Auth-protected.
    - **Reward History** (`/rewards`): Monthly reward distribution leaderboard, 6-tier reward structure (Rank 1: 5000 → 51-100: 200 ENTGL), personal reward history, expandable monthly leaderboards. Auth-protected.
    - **Token Admin** (`/token-admin`): Supply overview, reward distribution trigger, share price/token valuation controls, marketplace stats. Admin-tier restricted.
    - **Smart Contract**: EntangleCoin.sol ERC-20 (100M total supply, 75/25 founder/rewards split), batch distribution, travel booking burn, Hardhat + Sepolia deploy config.
    - **DB Schema**: token_transactions, reward_distributions, travel_bookings, token_config tables; users extended with walletAddress + tokenBalance.
- **Mobile Design**: Fully responsive, mobile-first design with bottom navigation and optimized components.

### API Server (`artifacts/api-server`)
- Express 5 server with Clerk middleware for authentication.
- **Security**: Helmet for HTTP security headers (CSP disabled for SPA compatibility). Global rate limit of 120 req/min with `express-rate-limit` (skips Clerk proxy and Stripe webhooks). AI-specific rate limit of 15 req/min on `/api/taxgpt`, `/api/analyze-document`, and `/api/analyze`.
- Stripe webhook endpoint for payment events.
- **Alpaca Market Data**: Proxy routes to Alpaca Markets API for real-time stock snapshots, historical OHLCV bars, quotes, trades, and market movers.
- **News Intelligence**: `/api/news` endpoint with RSS feed scraping via `rss-parser`, relevance scoring (35+ keywords), sentiment analysis, ticker extraction, category filtering, search, pagination, and 5-min cache.
- **Routes**: Health checks, stock data, AI analysis, user management, résumé operations, job search, KYC, Stripe config, TaxGPT (with profile context), document analysis (`/api/analyze-document`), Alpaca proxy, news intelligence, gamification (XP, badges, challenges, streaks, leaderboard), and token system (wallet linking, balance, transactions, rewards, travel bookings, admin distribution/config).

# External Dependencies

- **Monorepo tool**: pnpm workspaces
- **API framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **AI**: OpenAI (via Replit AI Integrations proxy)
- **Validation**: Zod, `drizzle-zod`
- **Build**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Clerk React, react-error-boundary
- **Charts**: TradingView Lightweight Charts (candlestick/volume charts in Technical Analysis, reusable LightweightChart component)
- **Maps**: Leaflet.js with OpenStreetMap tiles and Nominatim geocoding (Travel Budget Planner)
- **Market Data**: Alpaca Markets API (paper trading keys, IEX feed)
- **Client-side Routing**: wouter

# Documentation

- **Product Requirements Document**: `docs/PRD.md` — Comprehensive PRD covering product overview, architecture, feature inventory, database schema, external dependencies, subscription tiers, project status, non-goals, open questions/risks, and success metrics.