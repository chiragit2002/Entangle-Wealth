# Overview

EntangleWealth is a pnpm workspace monorepo using TypeScript, designed as a financial analysis platform. Its core mission is to help everyday families make better financial decisions by providing tools for stock analysis, job search, résumé building, gig marketplaces, and a comprehensive TaxFlow suite for tax management. The platform features a unique "quantum entanglement" AI analysis method where multiple AI agents cross-check each other for consensus-based signals. It integrates with Clerk for authentication, Stripe for payments, and OpenAI for AI capabilities. The platform aims to be honest and straightforward, avoiding hype or AI slop, and focuses on practical financial tools.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and security. For UI/UX, maintain the established dark theme with electric blue and gold accents. Ensure all CSV exports are formula-injection safe. Implement robust rate limiting for AI features. All buttons should have a minimum height of 44px for mobile touch targets.

# System Architecture

## Monorepo Structure
The project is a pnpm workspace monorepo with each package managing its own dependencies.

## UI/UX and Design System
- **Theme**: Dark theme with a black background, electric blue (`#00D4FF`), and gold (`#FFD700`) accents.
- **Fonts**: JetBrains Mono for data displays and Inter for UI elements.
- **CSS Utilities**: Includes `.electric-text`, `.gold-text`, and `.glass-panel` for consistent styling.
- **Routing**: `wouter` for client-side routing.
- **Responsiveness**: Mobile-responsive design with a hamburger navigation menu and a bottom navigation bar on screens smaller than 1024px.
- **Components**: Utilizes shadcn/ui components.

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
    - **Business Travel Planner**: 4-step wizard for trip planning, IRS deduction browsing, itinerary building, and export with compliance scoring.
    - **TaxGPT**: AI chat for tax Q&A (gpt-4o-mini), with quick buttons and client-side fallback/rate limiting.
- **Technical Analysis**: TradingView-inspired layout with 55+ technical indicators, full stock search, persistent watchlist, and candlestick charts with overlays. Features 6 AI agent reviews.
- **Market Overview**: Dashboard for major indices, economic indicators, sector heatmaps, global markets, and market breadth.
- **Stock Screener**: Filterable and sortable stock list with AI signal and confidence.
- **Dashboard**: Central command center with stock search, quick analysis, portfolio charts, and economic calendar.
- **Notification Center**: In-app alerts for signals, price alerts, and system messages, with configurable alert settings.
- **Options**: Detailed options chain with Greeks, expiration dates, and unusual options activity tables.
- **Terminal**: Interactive terminal with commands like QUOTE, ANALYZE (AI), SEARCH, RISK, etc.

- **Pricing** (`/pricing`): 3-tier pricing page (Starter $0, Pro $29/mo, Business $79/mo) with feature comparison, free trial CTA, and referral program section.
- **Terms of Use** (`/terms`): Full legal terms covering acceptance, service description, financial advice disclaimer, market data & third-party services (Alpaca), user accounts, subscriptions, AI analysis disclosure, prohibited uses, IP, liability, risk disclosure, indemnification, and governing law.
- **Privacy Policy** (`/privacy`): Comprehensive privacy policy covering data collection, usage, sharing, security, retention, user rights (CCPA), international transfers, and children's privacy.
- **Mobile Design**: Fully responsive mobile-first design with bottom navigation (Home, Signals, Analysis, TaxFlow, Pricing), signal cards with confidence bars and indicator panels, quantum entanglement matrix canvas, live ticker tape, and mobile-optimized card components.

## API Server (`artifacts/api-server`)
- Express 5 server with Clerk middleware for authentication.
- Stripe webhook endpoint for payment events.
- **Alpaca Market Data**: Proxy routes to Alpaca Markets API for real-time stock snapshots, historical OHLCV bars, quotes, trades, and market movers. Endpoints: `/api/alpaca/snapshot/:symbol`, `/api/alpaca/snapshots`, `/api/alpaca/bars/:symbol`, `/api/alpaca/quote/:symbol`, `/api/alpaca/trades/:symbol`, `/api/alpaca/multibars`, `/api/alpaca/movers`, `/api/alpaca/account`. Uses IEX feed. Falls back to mock data on auth errors.
- **Routes**: Health check, stocks data, AI analysis (rate-limited), user management, résumé operations, job search/save, KYC submission, Stripe configuration/checkout, TaxGPT queries, and Alpaca market data proxy.

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
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Clerk React
- **Market Data**: Alpaca Markets API (paper trading keys, IEX feed)
- **Client-side Routing**: wouter