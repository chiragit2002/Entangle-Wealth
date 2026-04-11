# EntangleWealth — Product Requirements Document

---
Version: 1.0
Last updated: 2026-04-10
Status: Draft
Owner: Product / Founding Team
---

## 1. Product Overview

**EntangleWealth** is an institutional-grade financial intelligence platform built for retail investors, freelancers, and working parents. It combines AI-driven market analysis, tax optimization, career tools, and a gamified reward economy into a single "Bloomberg-meets-TurboTax" experience. The platform's core metaphor is *quantum entanglement* — every discipline (trading, tax law, career growth, budgeting) is interconnected, so a decision in one area surfaces insights across the others.

**Target users:**
- Retail investors who want institutional-quality tools without the Bloomberg Terminal price tag
- Freelancers and gig workers managing irregular income, self-employment taxes, and side hustles
- Working parents balancing career growth, investment, and tax planning

**Core value proposition:** One platform that connects the dots between earning, investing, tax optimization, and spending — so users keep more of what they make.

---

## 2. Architecture Summary

| Layer | Technology | Notes |
|:---|:---|:---|
| Frontend | React 18 + Vite, Tailwind CSS, Radix UI, wouter | Dark terminal aesthetic (cyan/gold/purple) |
| Backend | Express.js + TypeScript | RESTful API at `/api` prefix |
| Database | PostgreSQL via Drizzle ORM | 18 tables across 6 domains |
| Auth | Clerk (OpenID Connect) | Sign-in/sign-up, protected routes, backend middleware |
| Payments | Stripe | Checkout, subscriptions, billing portal, webhooks |
| Market Data | Alpaca Markets API | Snapshots, bars, quotes, paper trading |
| AI | OpenAI (gpt-5-mini, gpt-5-nano, gpt-4o-mini) | Multi-agent analysis, TaxGPT, audio/realtime hooks |
| News | RSS feeds (15+ sources) via rss-parser | Scored by financial relevance |
| Blockchain | Hardhat + Solidity | EntangleCoin ERC-20 contract |
| Monorepo | pnpm workspaces | Shared libs: `lib/db`, `lib/api-spec`, `lib/api-zod` |

---

## 3. Feature Inventory — What Exists Today

### 3.1 Market Intelligence & Charting

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Dashboard | `/dashboard` | Built | Command center: portfolio stats, Flash Council AI agents, market internals (VIX, TICK, A/D) |
| Terminal | `/terminal` | Built | Bloomberg-style CLI for rapid data retrieval (Mirofish) |
| Market Overview | `/market-overview` | Built | Broad market health, sector heatmaps, economic calendar |
| Stock Explorer | `/stocks` | Built | Search/filter Nasdaq stocks by sector, market cap; detailed per-stock view |
| Screener | `/screener` | Built | Multi-criteria stock screening tool |
| Technical Analysis | `/technical` | Built | TradingView-replica charts with HTML5 Canvas, 70+ indicators, drawing tools, pattern recognition |
| Charts | `/charts` | Built | Dedicated charting interface |
| Options | `/options` | Built | Options chain analysis |
| Volatility Lab | `/volatility` | Built | Volatility surfaces, Greeks tracking |
| Sector Flow | `/sector-flow` | Built | Sector rotation and money flow analysis |
| Time Machine | `/time-machine` | Built | Historical backtesting tool |
| Competitive Intel | `/competitive-intel` | Built | Peer comparison and market competition analysis |
| Open Source Intel | `/open-source-intel` | Built | OSINT aggregation from 15+ RSS feeds with relevance scoring |
| Research | `/research` | Built | Investment research tools |
| Case Study | `/case-study` | Built | Detailed financial/trading case studies |

**AI Analysis Engine:**
- `POST /api/stocks/:symbol/analyze` — Full "Quantum Agent Swarm" multi-model consensus (Risk Manager, Quant, Technical Analyst agents)
- `POST /api/stocks/:symbol/quick-analyze` — Lightweight single-agent summary

### 3.2 Tax & Financial Planning

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| TaxGPT | `/taxgpt` | Built | AI chat assistant trained on IRS publications; identifies deductions, audit risks, QBI, SE health insurance |
| Tax Dashboard | `/tax` | Built | Tax planning overview |
| Receipts | `/receipts` | Built | Expense and receipt tracking |
| Travel Planner | `/travel` | Built | Trip planning with personal & business modes; budget tracking; tax-deductible business travel wizard |
| TaxFlow Platform | (merging) | In progress | Comprehensive deduction dashboard, strategy browser with IRS code refs, AI document vault, savings estimator |

**TaxGPT API:** `POST /api/taxgpt` — Streaming AI responses with deep IRS knowledge (IRC §162, §199A QBI, Form 8995, SE health insurance, etc.)

### 3.3 Career & Earning Tools

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Earn | `/earn` | Built | Gamification / earning overview |
| Jobs | `/jobs` | Built | Job search via JSearch API, save/unsave listings |
| Gigs | `/gigs` | Built | Freelance marketplace: post, search, filter gigs |
| Resume Builder | `/resume` (protected) | Built | AI-assisted resume creation with experience, education, skills, certifications |

**APIs:**
- Resume CRUD: `GET/POST/PUT/DELETE /api/resumes`
- Job search & save: `GET /api/jobs/search`, `POST /api/jobs/save`
- Gig marketplace: `GET/POST/DELETE /api/gigs`

### 3.4 Gamification & Rewards

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Leaderboard | `/leaderboard` | Built | Global rankings (weekly/monthly/all-time) |
| Achievements | `/achievements` | Built | Badges and milestones |
| Earn Hub | `/earn` | Built | XP earning overview |

**System details:**
- XP earned from: trading signals used, gig completions, community contributions, daily streaks
- Tier progression: Bronze → Silver → Gold → Platinum → Diamond
- Challenges with progress tracking and time-limited events
- Streak system with multiplier bonuses
- Leaderboard snapshots by period

**APIs:** Full gamification API suite at `/api/gamification/*` (13 endpoints covering XP, badges, challenges, streaks, leaderboard)

### 3.5 EntangleCoin Token Economy (In Progress — Task #8)

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Token Wallet | `/wallet` (protected) | Building | Ethereum wallet linking, balance display |
| Reward History | `/rewards` (protected) | Building | Token distribution history |
| Travel Marketplace | `/travel` (protected) | Building | Book hotels/flights with EntangleCoin |
| Token Admin | `/token-admin` (protected) | Building | Admin panel for reward distribution and config |

**System details:**
- ERC-20 smart contract (Solidity via Hardhat)
- 75% founder allocation, monthly distribution to top 100 users by portfolio gains
- Token-based travel booking with on-chain transaction logging
- KYC verification required before token operations

**APIs:** Token suite at `/api/token/*` (10 endpoints) + KYC at `/api/kyc/*` (3 endpoints)

### 3.6 Payments & Subscriptions

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Pricing | `/pricing` | Built | Tier display (Free / Pro / Enterprise) |

**Integration:** Stripe checkout, subscription management, billing portal, webhooks. Synced via `stripe-replit-sync`.

### 3.7 User Management & Auth

| Feature | Route | Status | Description |
|:---|:---|:---|:---|
| Sign In/Up | `/sign-in`, `/sign-up` | Built | Clerk-powered authentication |
| Profile | `/profile` (protected) | Built | User settings, bio, headline, location, public profile toggle |
| Community | `/community` | Built | Social / community features |

### 3.8 SEO & Content

Server-rendered learning center with 6 content verticals:
- `/learn` — Financial glossary
- `/indicators` — Technical indicator guides
- `/strategies` — Trading strategy guides
- `/patterns` — Chart pattern education
- `/sectors` — Sector analysis
- `/compare` — Asset comparisons
- Full sitemap and robots.txt support

---

## 4. Database Schema Summary

| Domain | Tables | Key entities |
|:---|:---|:---|
| Users | `users` | Profile, Clerk ID, Stripe IDs, KYC status, wallet address, token balance |
| Careers | `resumes`, `resume_experiences`, `resume_education`, `saved_jobs` | Full resume builder with work history |
| Gigs | `gigs` | Freelance marketplace listings |
| Gamification | `user_xp`, `xp_transactions`, `badges`, `user_badges`, `challenges`, `user_challenges`, `streaks`, `leaderboard_snapshots` | 8 tables for full gamification engine |
| Token | `token_transactions`, `reward_distributions`, `travel_bookings`, `token_config` | On-chain reward economy |
| AI | `conversations`, `messages` | Chat history for TaxGPT and analysis sessions |

**Total: 18 tables across 6 domains.**

---

## 5. External Dependencies & Integrations

| Service | Purpose | Auth Method | Risk Level |
|:---|:---|:---|:---|
| Clerk | User auth & sessions | API keys (frontend + backend) | Low — managed service |
| Stripe | Payments & subscriptions | API keys + webhooks | Medium — financial data |
| Alpaca | Market data & paper trading | API key + secret | Medium — rate limits, market hours |
| OpenAI | AI analysis, TaxGPT, audio | API key via Replit proxy | Medium — cost scales with usage |
| RSS feeds (15+) | News intelligence | Public (no auth) | Low — degraded gracefully |
| Ethereum (Hardhat) | EntangleCoin smart contract | Private key (deployment) | High — immutable on-chain |
| JSearch | Job listings | API key | Low — fallback to mock data |

---

## 6. Subscription Tiers

| Tier | Price | Intended access |
|:---|:---|:---|
| Free | $0 | Basic market data, limited AI queries, job board, gig marketplace |
| Pro | TBD | Full AI analysis suite, TaxGPT, resume builder, advanced charting |
| Enterprise | TBD | API access, team features, priority support, custom integrations |

*Note: Tier enforcement is partially implemented. Stripe integration exists but feature gating per tier needs completion.*

---

## 7. Current Project Status

| Task | State | Summary |
|:---|:---|:---|
| #1 Godlike System Prompt | Merged | 63+ profession AI identity for platform assistant |
| #2 MiroFish News Intelligence | Merged | Live RSS scraping, relevance scoring, OSINT feed |
| #3 TaxGPT Prompt Upgrade | Merged | Deep IRS knowledge base for tax AI |
| #4 Travel Budget Planner | Merged | Trip planning with business/personal modes |
| #5 TradingView Chart Replica | Merged | Canvas-rendered charts, 70+ indicators, AI scanner |
| #6 TaxFlow Intelligence | Merging | Deduction dashboard, strategy browser, document vault |
| #7 Gamification Engine | Merged | XP, tiers, badges, streaks, challenges, leaderboard |
| #8 EntangleCoin & Rewards | Active | ERC-20 token, monthly rewards, travel marketplace |

---

## 8. Non-Goals (Current Phase)

- Native mobile app (web-first for now)
- Real-money brokerage (paper trading only via Alpaca)
- Mainnet token deployment (testnet/simulation only at this stage)
- Multi-language / i18n support
- Team or enterprise collaboration features
- Custom API access for third-party developers

---

## 9. Open Questions & Risks

| # | Question / Risk | Impact |
|:---|:---|:---|
| 1 | **Tier enforcement:** Which features are gated behind Pro/Enterprise? Need a definitive access matrix. | Monetization |
| 2 | **Token economics:** What is EntangleCoin's real-world value model? Is it a utility token or rewards points? SEC/regulatory implications if tradable. | Legal/compliance |
| 3 | **Alpaca rate limits:** Heavy usage on market data endpoints; need caching strategy for scale. | Reliability |
| 4 | **OpenAI cost management:** Multi-agent analysis (Flash Council) uses expensive models per request. Need usage caps or tier-based throttling. | Unit economics |
| 5 | **Travel marketplace legitimacy:** Are hotel/flight bookings real (API integration) or simulated? Needs clarification for users. | Trust |
| 6 | **KYC process:** Currently manual admin approval. What's the plan for automated identity verification? | Scale |
| 7 | **Data accuracy disclaimer:** AI-generated tax advice and stock analysis carry liability risk. Need prominent disclaimers. | Legal |
| 8 | **SEO content:** Learning center pages are server-rendered. Are they handwritten or auto-generated? Quality control plan? | Brand |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|:---|:---|:---|
| Monthly Active Users (MAU) | TBD | Clerk auth sessions |
| AI Queries / User / Month | TBD | API request logs |
| Free → Pro Conversion Rate | TBD | Stripe subscription events |
| Gamification Engagement | TBD | Daily streak check-ins, XP transactions |
| TaxGPT Deductions Identified | TBD | Per-session deduction count from AI responses |
| Average Session Duration | TBD | Frontend analytics |

*Targets should be set after establishing baseline measurements from initial user cohort.*

---

### Changelog

| Version | Date | Author | Change summary |
|:---|:---|:---|:---|
| 1.0 | 2026-04-10 | Agent | Initial comprehensive PRD from codebase audit |
