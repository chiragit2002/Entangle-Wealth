export const marketTickerData = [
  { symbol: "SPY", price: 512.45, change: "+1.2%", isPositive: true },
  { symbol: "QQQ", price: 438.12, change: "+1.5%", isPositive: true },
  { symbol: "AAPL", price: 175.84, change: "-0.3%", isPositive: false },
  { symbol: "MSFT", price: 412.30, change: "+0.8%", isPositive: true },
  { symbol: "NVDA", price: 875.20, change: "+3.4%", isPositive: true },
  { symbol: "TSLA", price: 198.45, change: "-1.2%", isPositive: false },
  { symbol: "META", price: 185.20, change: "-0.5%", isPositive: false },
  { symbol: "AMZN", price: 495.10, change: "+1.1%", isPositive: true },
  { symbol: "GOOGL", price: 485.90, change: "+0.9%", isPositive: true },
  { symbol: "NFLX", price: 615.30, change: "+2.1%", isPositive: true },
];

export const stockAlerts = [
  { id: 1, symbol: "NVDA", price: 875.20, type: "BUY", confidence: 95, agentSource: "AGENT 201 + 226", pattern: "Bull Flag Breakout", structure: "Higher Highs" },
  { id: 2, symbol: "AAPL", price: 175.84, type: "HOLD", confidence: 55, agentSource: "AGENT 224 + 211", pattern: "Range Compression", structure: "Neutral Consolidation" },
  { id: 3, symbol: "TSLA", price: 198.45, type: "SELL", confidence: 82, agentSource: "AGENT 203 + 206", pattern: "RSI Divergence", structure: "Lower Highs" },
  { id: 4, symbol: "PLTR", price: 24.50, type: "BUY", confidence: 88, agentSource: "AGENT 225 + 209", pattern: "Wyckoff Accumulation", structure: "Spring Phase" },
  { id: 5, symbol: "COIN", price: 23.10, type: "BUY", confidence: 76, agentSource: "AGENT 214 + 217", pattern: "Short Squeeze Setup", structure: "Relative Strength" },
  { id: 6, symbol: "AMD", price: 162.75, type: "BUY", confidence: 91, agentSource: "AGENT 208 + 204", pattern: "Bollinger Squeeze", structure: "VWAP Reclaim" },
];

export const optionsAlerts = [
  { id: 1, symbol: "SPY", strike: 515, type: "CALL", exp: "2024-05-17", volSpike: true, premium: "$2.5M", agentSource: "AGENT 231 + 236", flowType: "Institutional Sweep" },
  { id: 2, symbol: "QQQ", strike: 430, type: "PUT", exp: "2024-05-17", volSpike: true, premium: "$1.8M", agentSource: "AGENT 245 + 246", flowType: "Portfolio Hedge" },
  { id: 3, symbol: "NVDA", strike: 900, type: "CALL", exp: "2024-06-21", volSpike: false, premium: "$4.2M", agentSource: "AGENT 232 + 233", flowType: "Delta Accumulation" },
  { id: 4, symbol: "AMD", strike: 200, type: "CALL", exp: "2024-05-24", volSpike: true, premium: "$950K", agentSource: "AGENT 244 + 235", flowType: "Pre-Earnings Position" },
  { id: 5, symbol: "TSLA", strike: 180, type: "PUT", exp: "2024-05-17", volSpike: true, premium: "$3.1M", agentSource: "AGENT 239 + 234", flowType: "Iron Condor Leg" },
];

export const unusualOptionsActivity = [
  { id: 1, symbol: "TSLA", strike: 210, type: "CALL", exp: "2024-05-17", delta: 0.35, gamma: 0.05, theta: -0.12, ivRank: 85, strength: 92, time: "10:45 AM", agentSource: "AGENT 236", strategy: "Bull Call Spread" },
  { id: 2, symbol: "AAPL", strike: 170, type: "PUT", exp: "2024-05-17", delta: -0.42, gamma: 0.06, theta: -0.08, ivRank: 45, strength: 65, time: "11:12 AM", agentSource: "AGENT 238", strategy: "Cash Secured Put" },
  { id: 3, symbol: "META", strike: 500, type: "CALL", exp: "2024-06-21", delta: 0.28, gamma: 0.03, theta: -0.15, ivRank: 72, strength: 88, time: "11:30 AM", agentSource: "AGENT 243", strategy: "Calendar Spread" },
  { id: 4, symbol: "MSFT", strike: 400, type: "PUT", exp: "2024-05-24", delta: -0.55, gamma: 0.08, theta: -0.09, ivRank: 30, strength: 52, time: "1:15 PM", agentSource: "AGENT 242", strategy: "Bear Put Spread" },
  { id: 5, symbol: "NVDA", strike: 950, type: "CALL", exp: "2024-05-17", delta: 0.45, gamma: 0.07, theta: -0.22, ivRank: 95, strength: 98, time: "2:45 PM", agentSource: "AGENT 231", strategy: "Directional Sweep" },
  { id: 6, symbol: "SPY", strike: 520, type: "CALL", exp: "2024-06-21", delta: 0.32, gamma: 0.04, theta: -0.11, ivRank: 62, strength: 85, time: "3:10 PM", agentSource: "AGENT 245", strategy: "Bullish Accumulation" },
  { id: 7, symbol: "AMD", strike: 180, type: "CALL", exp: "2024-05-17", delta: 0.52, gamma: 0.09, theta: -0.18, ivRank: 78, strength: 94, time: "3:35 PM", agentSource: "AGENT 244", strategy: "Pre-Earnings Straddle" },
];

export const agentSwarmData = {
  totalAgents: 300,
  activeAgents: 297,
  councilsPerMinute: 30,
  signalsProcessed: "2.4M",
  consensusRate: 94.7,
  categories: [
    { name: "Core Foundation", range: "01-12", count: 12, color: "#00D4FF", description: "UI/UX, debugging, visualization, predictive intelligence, red team" },
    { name: "Economic Survival", range: "13-25", count: 13, color: "#FFD700", description: "Cost of living, income opportunities, financial literacy, gig economy" },
    { name: "Market Intelligence", range: "26-38", count: 13, color: "#00FF88", description: "Stocks, crypto, real estate, commodities, e-commerce, tax optimization" },
    { name: "Prediction & Intelligence", range: "39-52", count: 14, color: "#FF6B6B", description: "Sentiment, behavioral economics, geopolitical risk, black swan detection" },
    { name: "Technology & Platform", range: "53-65", count: 13, color: "#9B59B6", description: "Full stack, database, API, ML, NLP, cybersecurity, mobile" },
    { name: "Community & Growth", range: "66-100", count: 35, color: "#3498DB", description: "Gamification, community, onboarding, family tools, emergency" },
    { name: "Maintenance & Evolution", range: "101-120", count: 20, color: "#E67E22", description: "CI/CD, regression testing, uptime, SEO, conversion optimization" },
    { name: "Business Opportunity", range: "121-140", count: 20, color: "#1ABC9C", description: "Partnerships, grants, enterprise sales, marketplace, global expansion" },
    { name: "Legal & Compliance", range: "141-155", count: 15, color: "#95A5A6", description: "Legal compliance, privacy, dispute resolution, fraud detection" },
    { name: "User Intelligence", range: "156-175", count: 20, color: "#F39C12", description: "Personalization, lifecycle, accessibility, family profiles" },
    { name: "Advanced Analytics", range: "176-200", count: 25, color: "#8E44AD", description: "Real-time analytics, A/B testing, cohort analysis, churn prediction" },
    { name: "Stock Market Mastery", range: "201-230", count: 30, color: "#00D4FF", description: "Price action, volume profile, VWAP, RSI, MACD, Fibonacci, Ichimoku" },
    { name: "Options Mastery", range: "231-260", count: 30, color: "#FFD700", description: "Greeks mastery, unusual activity, spreads, iron condors, hedging" },
    { name: "Risk & Execution", range: "261-280", count: 20, color: "#E74C3C", description: "Position sizing, portfolio hedging, risk management, execution" },
    { name: "Quantum Command", range: "281-300", count: 20, color: "#2ECC71", description: "Hyperspeed council, conflict resolution, consensus, decision engine" },
  ],
};

export const flashCouncilData = [
  { time: "0.0s", action: "All 300 agents submit highest-priority signal" },
  { time: "0.5s", action: "Conflicts flagged and quantum interference detected" },
  { time: "1.0s", action: "AGENT 299 resolves all conflicts instantly" },
  { time: "1.5s", action: "THE ABSOLUTE renders final consensus decision" },
  { time: "2.0s", action: "All agents execute simultaneously" },
];

export const agentHighlights = {
  stockAgents: [
    { id: 201, name: "Price Action Surgeon", status: "active", signal: "Bull structure confirmed on NVDA" },
    { id: 202, name: "Volume Profile Architect", status: "active", signal: "High volume node at SPY $510" },
    { id: 206, name: "RSI Divergence Hunter", status: "alert", signal: "Hidden bullish divergence on TSLA 1H" },
    { id: 209, name: "Fibonacci Precision Agent", status: "active", signal: "Golden pocket entry at AMD $158" },
    { id: 216, name: "Institutional Order Flow", status: "alert", signal: "Dark pool prints detected NVDA" },
    { id: 217, name: "Short Squeeze Detector", status: "active", signal: "COIN short interest rising to 28%" },
    { id: 225, name: "Market Cycle Timing", status: "active", signal: "Wyckoff spring phase on PLTR" },
    { id: 226, name: "Pattern Recognition", status: "active", signal: "Cup and handle forming on AMD" },
  ],
  optionsAgents: [
    { id: 231, name: "Options Chain Reader", status: "alert", signal: "Unusual OI shift on NVDA 950C" },
    { id: 232, name: "Delta Master", status: "active", signal: "Portfolio delta neutral at +0.02" },
    { id: 233, name: "Gamma Exposure Specialist", status: "alert", signal: "Dealer gamma flip at SPY $515" },
    { id: 235, name: "Vega & IV Agent", status: "active", signal: "IV crush expected post-NVDA earnings" },
    { id: 236, name: "Unusual Activity Scanner", status: "alert", signal: "$4.2M sweep on NVDA 950C 05/17" },
    { id: 237, name: "Covered Call Income", status: "active", signal: "3.2% monthly yield on AAPL position" },
    { id: 240, name: "Position Sizing Master", status: "active", signal: "Kelly criterion: 2.1% allocation" },
    { id: 245, name: "Options Flow Aggregator", status: "alert", signal: "Multi-exchange bullish consensus" },
  ],
};
