# Overview

EntangleWealth is a pnpm monorepo financial analysis platform designed to help families make better financial decisions. It offers tools for stock analysis, job searching, résumé building, gig marketplaces, and a comprehensive TaxFlow suite. The platform features a "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals, aiming to provide honest and practical financial insights.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## Monorepo Structure
The project uses a pnpm workspace monorepo.

## UI/UX and Design System
- **Theme**: Dark theme with black background, electric blue (`#00D4FF`), gold (`#FFD700`), and tertiary purple (`#9c27b0`) accents.
- **Typography**: JetBrains Mono for data displays and Inter for UI elements.
- **Visuals**: Glassmorphism effects with blurred panels, gradient borders, custom scrollbars, and animations.
- **Navigation**: Navbar with dropdown groups (Trading, Tools, Research, Compete, EntangleCoin, More) and a mobile-responsive bottom navigation bar.
- **Components**: Utilizes shadcn/ui.
- **Layout Background**: Animated gradient orbs and a subtle dot grid overlay.
- **Core Features**:
    - **Competitive Intelligence**: Quantum competitive analysis with positioning, feature matrix, and PDF export.
    - **Résumé Builder**: Quantum Résumé Entanglement Engine with templates, LinkedIn import, accounting software integration, and a Quantum Coherence Score.
    - **Open Source Intel**: GitHub Solution Entanglement Map.
    - **TradingView Charts**: Professional charting platform with HTML5 candlestick engine, 40+ technical indicators, AI scanner, pattern detection, drawing tools, and price alerts.

## Technical Implementations
- **Authentication**: Clerk.
- **Database**: PostgreSQL with Drizzle ORM.
- **API**: Express 5 server.
- **AI Integration**: OpenAI via Replit AI Integrations proxy, using `gpt-4o-mini`. Anthropic Claude via Replit AI Integrations proxy for marketing content generation.
- **Validation**: Zod.
- **Build**: `esbuild`.
- **Frontend**: React with Vite and Tailwind CSS.
- **Payments**: Stripe for subscriptions and payment processing, requiring KYC verification.
- **Data Management**: LocalStorage for client-side persistence.

## Feature Specifications

### EntangleWealth (`artifacts/entangle-wealth`)
- **Core AI Analysis**: "Quantum Entanglement Analysis" uses 7 specialized AI agents to analyze stocks, providing signals only on consensus. Rate-limited.
- **Stock Explorer**: Displays 5,000 NASDAQ stocks with search, filter, Top Gainers/Losers, and detailed views.
- **Job Search**: Searchable job listings with filters, pagination, and job saving.
- **Résumé Builder**: Step-by-step guided builder with live preview, supporting traditional and gig work, and 3 customizable templates. Exports to PDF.
- **Gig Marketplace**: Browse and post local service gigs.
- **Profile**: User profile management, investment progress stats, privacy settings, KYC verification, and gamification stats.
- **Gamification & Leaderboard Engine**: Competitive gamification system with tiered levels, XP system, achievement badges, daily/weekly challenges, streak tracking, and a live leaderboard.
- **KYC Verification**: Multi-step form for personal info and government ID.
- **Stripe Payments**: Integration for subscription products (Pro, Enterprise) with checkout sessions and a customer portal.
- **Community**: 5-tab interface (Groups, Feed, Events, Jobs, Pricing) with client-side state.
- **TaxFlow Intelligence Platform**:
    - **Core Data Layer**: Shared types, IRS tax rate tables (2024/2025/2026), 27 tax strategies engine, and localStorage profile management.
    - **Onboarding Wizard**: 4-step modal for user tax profile creation.
    - **Tax Year Selector**: Dropdown in navbar (2024–2026).
    - **Tax Dashboard**: Compliance score, deduction breakdown, missed opportunity alerts, side-by-side tax estimator, CPA report export, and CSV deduction export.
    - **Tax Strategy Browser**: 27 filterable strategies with IRC references, risk badges, estimator functions.
    - **Document Vault**: Drag-and-drop upload with AI document analysis, document cards, ledger view, category filters, mileage log module, and mileage CSV export.
    - **TaxGPT**: Profile-aware AI tax assistant (gpt-4o-mini) with chat history and personalized answers.
    - **Travel Budget Planner**: Dual-mode planner (Personal Trip and Business Trip) with Leaflet.js map, itinerary builder, budget summary, and IRS deduction tracking.
    - **Legal Disclaimers**: Educational-only disclaimers.
- **Technical Analysis**: TradingView-inspired layout with 55+ technical indicators, full stock search, persistent watchlist, and candlestick charts with 6 AI agent reviews.
- **Market Overview**: Dashboard for major indices, economic indicators, sector heatmaps, global markets, and market breadth.
- **Stock Screener**: Filterable and sortable stock list with AI signal and confidence.
- **Dashboard**: Bloomberg-style Command Center with 8-stat header bar, Quantum Entanglement Matrix, Market Internals, Multi-Asset panel, Fear & Greed gauge, Watchlist, AI Model Feed, Stock Signals, Options Flow, Greeks, Signal History, Economic Calendar, and keyboard shortcuts.
- **Notification Center**: Real-time SSE-powered notification center with live alert streaming, unread counts, and quick alert configuration. Connects to server-sent events for instant push notifications.
- **Real-Time Alerts System**: Full-stack alert engine at `/alerts` with 6 alert types (price above/below, RSI oversold/overbought, MACD crossover, Bollinger breakout). Server-side 60-second evaluation cycle using live Alpaca data. SSE streaming at `/api/alerts/stream`. CRUD API with rate limits (Free: 10 alerts/day, 20 rules max; Pro: unlimited). Alert history with 30-day retention. DB tables: `alerts`, `alert_history`.
- **Options**: Detailed options chain with Greeks, expiration dates, and unusual options activity tables.
- **Terminal**: Bloomberg-style Analysis Terminal v3.0 with MiroFish multi-panel terminal (Order Flow, News Feed, System Log, Command Interface), Position Calculator, P&L Simulator, Signal History, and Risk Radar. Supports commands: QUOTE, ANALYZE (AI), SEARCH, NEWS, RISK, STATUS, SIGNALS, PORTFOLIO.
- **Research / News Intelligence**: MiroFish-powered live news intelligence page. Scrapes 15 RSS feeds across 5 categories. Features 35+ keyword relevance scoring, sentiment analysis, stock ticker detection, category filtering, search, expandable article summaries, and 5-minute server-side cache. SSRF protection.
- **"What If" Time Machine**: Historical investment simulator using real Alpaca market data.
- **Sector Flow Radar**: Real-time sector rotation visualization tracking 80 stocks across 8 sectors. Features animated radar chart, market regime indicator, sector breakdown cards, volume data, and top/worst movers.
- **Volatility Lab**: Multi-timeframe realized volatility analysis with institutional-grade risk metrics. Computes annualized vol at 5 timeframes, vol term structure chart, daily return distribution histogram, vol regime detection, and risk ratios.
- **Legal**: Terms of Use and Privacy Policy.
- **EntangleCoin Token System**:
    - **Token Wallet**: ENTGL balance, Ethereum wallet linking (Sepolia testnet), transaction history, token valuation, supply info.
    - **Travel Marketplace**: Luxury hotel/flight listings bookable with ENTGL tokens.
    - **Reward History**: Monthly reward distribution leaderboard, 6-tier reward structure, personal reward history.
    - **Token Admin**: Supply overview, reward distribution trigger, share price/token valuation controls, marketplace stats.
    - **Smart Contract**: EntangleCoin.sol ERC-20.
    - **DB Schema**: `token_transactions`, `reward_distributions`, `travel_bookings`, `token_config` tables; users extended with `walletAddress` + `tokenBalance`.
- **AI Marketing Command Center**: Admin-only `/marketing` page with 9 AI content agents (Reddit, Facebook, Instagram, Twitter/X, LinkedIn, GitHub, Blog/SEO, Email Newsletter, Community Reply). Each agent uses Claude AI with platform-specific system prompts, tone selectors, character limits, copy-to-clipboard, and save-to-queue. localStorage-backed content queue with Draft/Approved/Posted/Archived workflow, status filtering, and JSON export. Rate limited to 5 req/min.
- **Content Calendar**: Admin-only `/content-calendar` page for scheduling and tracking AI-generated content. Monthly calendar grid with color-coded platform chips, drag-and-drop rescheduling via HTML5 DnD, daily posting checklist with status management, "Best Times to Post" per-platform guide, unscheduled content sidebar, and CSV export (Buffer/Hootsuite compatible). Shares localStorage queue with Marketing AI via `@/lib/marketingQueue`.
- **SEO Engine**: Admin-only `/seo` page with 4 tabs (Keywords, Blog, Meta Tags, Backlinks). 50 default target keywords with volume/difficulty/rank/trend tracking. Blog post editor with AI generation (Claude), Markdown support, and SERP preview. Meta tag manager for 10 key pages with character counters. Backlink tracker with active/broken status. Public `/blog` index and `/blog/:slug` pages. All data localStorage-backed. Updated robots.txt and sitemap.
- **GitHub Solution Finder**: Standalone 9-tab GitHub intelligence platform (Search, Error Solver, Repos, Code, Issues, People, AI Lab, Trending, Bookmarks). Features GitHub REST + GraphQL API, Claude AI analysis, smart query parsing, syntax highlighting, markdown rendering, localStorage, rate limit tracking, and mobile responsive design.
- **Mobile Design**: Fully responsive, mobile-first design with bottom navigation.

### API Server (`artifacts/api-server`)
- Express 5 server with Clerk middleware.
- **Security**: Helmet for HTTP security headers. Global rate limit of 120 req/min with `express-rate-limit`. AI-specific rate limit of 15 req/min on AI-related endpoints.
- Stripe webhook endpoint for payment events.
- **Alpaca Market Data**: Proxy routes to Alpaca Markets API.
- **News Intelligence**: `/api/news` endpoint with RSS feed scraping, relevance scoring, sentiment analysis, ticker extraction, category filtering, search, pagination, and 5-min cache.
- **Routes**: Health checks, stock data, AI analysis, user management, résumé operations, job search, KYC, Stripe config, TaxGPT, document analysis, Alpaca proxy, news intelligence, gamification, token system, and marketing content generation.

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