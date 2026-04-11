export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: FaqCategory;
}

export type FaqCategory = "getting-started" | "trading" | "taxflow" | "billing" | "account" | "technical";

export const FAQ_CATEGORIES: { key: FaqCategory; label: string }[] = [
  { key: "getting-started", label: "Getting Started" },
  { key: "trading", label: "Trading" },
  { key: "taxflow", label: "TaxFlow" },
  { key: "billing", label: "Billing" },
  { key: "account", label: "Account" },
  { key: "technical", label: "Technical" },
];

export const FAQ_DATA: FaqItem[] = [
  { id: 1, category: "getting-started", question: "What is EntangleWealth?", answer: "EntangleWealth is a professional-grade financial analysis platform that provides real-time market data, 55+ technical indicators, AI-powered analysis, options flow tracking, and tax optimization tools — all in a Bloomberg Terminal-inspired interface designed for everyday investors." },
  { id: 2, category: "getting-started", question: "How do I create an account?", answer: "Click 'Sign In' in the top navigation bar, then select 'Sign Up'. You can register with your email address or use Google/GitHub OAuth for instant access. No credit card is required for the free tier." },
  { id: 3, category: "getting-started", question: "Is EntangleWealth free to use?", answer: "Yes, EntangleWealth offers a free tier with access to core features including the dashboard, market overview, stock explorer, and basic technical analysis. Premium plans unlock advanced features like AI-powered signals, unlimited screener filters, and priority support." },
  { id: 4, category: "getting-started", question: "What markets does EntangleWealth cover?", answer: "We cover 5,000+ NASDAQ-listed stocks with real-time data from Alpaca Markets. Our platform also displays market data for major indices (S&P 500, NASDAQ, DOW), crypto, forex, commodities, and bonds." },
  { id: 5, category: "getting-started", question: "How do I navigate the platform?", answer: "Use the top navigation bar to access different sections: Trading (Dashboard, Markets, Analysis), Tools (Time Machine, Vol Lab, Terminal), Research (News, Stocks, Blog), and more. On mobile, use the bottom navigation bar for quick access to key features." },
  { id: 6, category: "getting-started", question: "What is the Command Center Dashboard?", answer: "The Command Center is your personalized trading hub showing portfolio performance, market internals (VIX, TICK, A/D ratio), multi-asset data, quick stock analysis, AI agent logs, and gamification stats — all in a Bloomberg-style layout." },

  { id: 7, category: "trading", question: "How do the 55+ technical indicators work?", answer: "Our Technical Analysis page runs 55+ indicators across 4 categories: Trend (moving averages, Supertrend, ADX), Momentum (RSI, MACD, Stochastic), Volatility (Bollinger Bands, ATR, Keltner Channels), and Volume (OBV, CMF, VWAP). Each indicator produces a BUY, SELL, or NEUTRAL signal, which are synthesized by 6 AI agents into an overall consensus." },
  { id: 8, category: "trading", question: "What are the AI agents on the analysis page?", answer: "Six specialized AI agents review every stock analysis: Trend Analyst, Momentum Surgeon, Risk Manager, Volume Profiler, Devil's Advocate (contrarian view), and Consensus Engine. Each provides independent analysis and a final synthesized verdict with confidence percentage." },
  { id: 9, category: "trading", question: "How does the Options Flow page work?", answer: "The Options page shows unusual options activity with full Greeks breakdown (Delta, Gamma, Theta), IV Rank, signal strength scoring, and suggested strategies. You can filter by type (Call/Put), ticker, minimum strength, and IV rank." },
  { id: 10, category: "trading", question: "What is the Stock Screener?", answer: "The Screener lets you filter 5,000+ stocks by price, market cap, sector, and technical signals. Results include real-time prices, percent changes, and quick-analysis capabilities." },
  { id: 11, category: "trading", question: "How does the Time Machine work?", answer: "The Time Machine is a what-if simulator that lets you explore how a hypothetical investment in any stock would have performed over different time periods. Enter a stock, investment amount, and start date to see projected returns." },
  { id: 12, category: "trading", question: "What is the Volatility Lab?", answer: "The Vol Lab provides risk analytics including implied volatility analysis, historical volatility comparisons, volatility surface visualization, and risk metrics for stocks and options." },
  { id: 13, category: "trading", question: "Are the signals actual trading recommendations?", answer: "No. All signals, analysis, and data are for educational purposes only. EntangleWealth is not a registered investment advisor. Signals are automated computational outputs and should not be treated as financial advice. Always consult a qualified professional before making investment decisions." },
  { id: 14, category: "trading", question: "Where does the market data come from?", answer: "Real-time and historical market data is sourced from Alpaca Markets API. When live data is unavailable (e.g., outside market hours or for unsupported symbols), the platform uses simulated data clearly labeled as demo/mock data." },

  { id: 15, category: "taxflow", question: "What is TaxFlow?", answer: "TaxFlow is our integrated tax dashboard that helps you track deductions, organize receipts, estimate tax liability, and explore 25+ tax strategies. It includes AI-powered document analysis and a TaxGPT assistant for tax questions." },
  { id: 16, category: "taxflow", question: "Can TaxFlow file my taxes?", answer: "No. TaxFlow is an organizational and educational tool only. It helps you track and categorize deductions throughout the year, but you should work with a licensed CPA or tax professional for actual tax filing." },
  { id: 17, category: "taxflow", question: "How does receipt scanning work?", answer: "Upload photos of receipts to the Document Vault, and our AI will extract key information (vendor, amount, date, category). Receipts are stored securely and organized by tax category for easy reference." },
  { id: 18, category: "taxflow", question: "What is TaxGPT?", answer: "TaxGPT is an AI-powered assistant that can answer general tax questions, explain tax strategies, and help you understand deduction categories. It provides educational information only — not professional tax advice." },
  { id: 19, category: "taxflow", question: "What tax strategies are available?", answer: "We offer 25+ tax strategy guides covering topics like capital gains harvesting, loss harvesting, retirement account optimization, business deductions, real estate strategies, and more. Each strategy includes eligibility criteria, potential savings estimates, and implementation steps." },

  { id: 20, category: "billing", question: "What payment methods do you accept?", answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through our secure Stripe payment integration. All payments are processed with bank-level encryption." },
  { id: 21, category: "billing", question: "How do I upgrade my plan?", answer: "Visit the Pricing page from the navigation menu and select the plan that fits your needs. You'll be guided through a secure Stripe checkout process. Your account will be upgraded immediately upon successful payment." },
  { id: 22, category: "billing", question: "Can I cancel my subscription?", answer: "Yes, you can cancel your subscription at any time from your Profile page. Your premium features will remain active until the end of your current billing period. No refunds are issued for partial periods." },
  { id: 23, category: "billing", question: "What is EntangleCoin (ENTGL)?", answer: "EntangleCoin is our platform reward token. You earn ENTGL through daily engagement, streak bonuses, completing achievements, and referrals. Tokens can be redeemed in the Travel Marketplace for travel rewards and discounts." },
  { id: 24, category: "billing", question: "Do you offer refunds?", answer: "Please refer to our Terms of Use for our refund policy. If you have billing issues, please submit a support ticket and our team will assist you within 1–2 business days." },

  { id: 25, category: "account", question: "How do I update my profile?", answer: "Navigate to your Profile page (click your name in the top navigation or go to /profile). You can update your display name, bio, headline, location, and profile photo." },
  { id: 26, category: "account", question: "How do I change my email address?", answer: "Email changes are managed through your Clerk authentication settings. Click your profile avatar and select 'Manage Account' to update your email through Clerk's secure interface." },
  { id: 27, category: "account", question: "How does the referral program work?", answer: "Each user gets a unique referral code. Share it with friends — when they sign up using your code, both of you earn EntangleCoin bonus tokens. Find your referral code on your Profile page." },
  { id: 28, category: "account", question: "How do I enable notifications?", answer: "When prompted by the notification banner, click 'Enable Notifications' to receive browser push notifications for price alerts, signal updates, and platform announcements. You can manage notification preferences in your browser settings." },
  { id: 29, category: "account", question: "Can I delete my account?", answer: "To delete your account and all associated data, please submit a support ticket with subject 'Account Deletion Request'. Our team will process your request within 5 business days in compliance with our Privacy Policy." },

  { id: 30, category: "technical", question: "What browsers are supported?", answer: "EntangleWealth works best on modern browsers: Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. We recommend using the latest version of your browser for the best experience." },
  { id: 31, category: "technical", question: "Is there a mobile app?", answer: "EntangleWealth is a Progressive Web App (PWA) optimized for mobile. You can install it on your phone by tapping the 'Install App' prompt or using your browser's 'Add to Home Screen' option for an app-like experience." },
  { id: 32, category: "technical", question: "Why is market data showing as 'Demo data'?", answer: "Demo/simulated data is shown when: the market is closed, the Alpaca API is temporarily unavailable, or you're viewing a symbol not covered by our data provider. Live data is automatically used when available during market hours." },
  { id: 33, category: "technical", question: "The charts aren't loading. What should I do?", answer: "Try refreshing the page, clearing your browser cache, or using a different browser. If the issue persists, check our Status page for any ongoing service disruptions, or submit a support ticket." },
  { id: 34, category: "technical", question: "How do keyboard shortcuts work?", answer: "Press '?' on any page to see available keyboard shortcuts. Common shortcuts: '/' to focus search, '1-7' for quick page navigation, 'Esc' to close overlays. Shortcuts are disabled when typing in input fields." },
  { id: 35, category: "technical", question: "Is my data secure?", answer: "Yes. We use Clerk for authentication (industry-standard security), Stripe for payment processing (PCI DSS compliant), HTTPS encryption for all data in transit, and PostgreSQL with access controls for data at rest. We never store sensitive financial credentials." },
];
