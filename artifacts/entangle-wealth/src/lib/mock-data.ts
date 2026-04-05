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
  { id: 1, symbol: "NVDA", price: 875.20, type: "BUY", confidence: 87, source: "Price Action + Volume", pattern: "Bull Flag Breakout", note: "Strong volume on breakout above resistance. Continuation likely." },
  { id: 2, symbol: "AAPL", price: 175.84, type: "HOLD", confidence: 52, source: "Technical + Sentiment", pattern: "Range Compression", note: "No clear direction yet. Wait for breakout confirmation." },
  { id: 3, symbol: "TSLA", price: 198.45, type: "SELL", confidence: 74, source: "RSI + Market Structure", pattern: "Bearish Divergence", note: "RSI making lower highs while price tests resistance. Caution." },
  { id: 4, symbol: "PLTR", price: 24.50, type: "BUY", confidence: 79, source: "Accumulation Analysis", pattern: "Wyckoff Spring", note: "Institutional accumulation detected at support level." },
  { id: 5, symbol: "AMD", price: 162.75, type: "BUY", confidence: 83, source: "Squeeze Detection", pattern: "Bollinger Squeeze", note: "Volatility compression near VWAP. Expansion imminent." },
];

export const optionsAlerts = [
  { id: 1, symbol: "SPY", strike: 515, type: "CALL", exp: "2024-05-17", volSpike: true, premium: "$2.5M", flowType: "Large institutional sweep across multiple exchanges." },
  { id: 2, symbol: "QQQ", strike: 430, type: "PUT", exp: "2024-05-17", volSpike: true, premium: "$1.8M", flowType: "Likely portfolio hedge. Not necessarily bearish." },
  { id: 3, symbol: "NVDA", strike: 900, type: "CALL", exp: "2024-06-21", volSpike: false, premium: "$4.2M", flowType: "Steady delta accumulation ahead of earnings." },
  { id: 4, symbol: "AMD", strike: 200, type: "CALL", exp: "2024-05-24", volSpike: true, premium: "$950K", flowType: "Pre-earnings positioning. Elevated IV." },
  { id: 5, symbol: "TSLA", strike: 180, type: "PUT", exp: "2024-05-17", volSpike: true, premium: "$3.1M", flowType: "Part of a larger spread structure. Context matters." },
];

export const unusualOptionsActivity = [
  { id: 1, symbol: "TSLA", strike: 210, type: "CALL", exp: "2024-05-17", delta: 0.35, gamma: 0.05, theta: -0.12, ivRank: 85, strength: 92, time: "10:45 AM", strategy: "Bull Call Spread" },
  { id: 2, symbol: "AAPL", strike: 170, type: "PUT", exp: "2024-05-17", delta: -0.42, gamma: 0.06, theta: -0.08, ivRank: 45, strength: 65, time: "11:12 AM", strategy: "Cash Secured Put" },
  { id: 3, symbol: "META", strike: 500, type: "CALL", exp: "2024-06-21", delta: 0.28, gamma: 0.03, theta: -0.15, ivRank: 72, strength: 88, time: "11:30 AM", strategy: "Calendar Spread" },
  { id: 4, symbol: "MSFT", strike: 400, type: "PUT", exp: "2024-05-24", delta: -0.55, gamma: 0.08, theta: -0.09, ivRank: 30, strength: 52, time: "1:15 PM", strategy: "Bear Put Spread" },
  { id: 5, symbol: "NVDA", strike: 950, type: "CALL", exp: "2024-05-17", delta: 0.45, gamma: 0.07, theta: -0.22, ivRank: 95, strength: 98, time: "2:45 PM", strategy: "Directional Sweep" },
  { id: 6, symbol: "SPY", strike: 520, type: "CALL", exp: "2024-06-21", delta: 0.32, gamma: 0.04, theta: -0.11, ivRank: 62, strength: 85, time: "3:10 PM", strategy: "Bullish Accumulation" },
  { id: 7, symbol: "AMD", strike: 180, type: "CALL", exp: "2024-05-17", delta: 0.52, gamma: 0.09, theta: -0.18, ivRank: 78, strength: 94, time: "3:35 PM", strategy: "Pre-Earnings Straddle" },
];

export const portfolioChartData = [
  { time: "9AM", value: 14200 },
  { time: "10AM", value: 14380 },
  { time: "11AM", value: 14650 },
  { time: "12PM", value: 14520 },
  { time: "1PM", value: 14890 },
  { time: "2PM", value: 15180 },
  { time: "3PM", value: 15340 },
  { time: "NOW", value: 15620 },
];

export const optionsIncomeData = [
  { day: "Mon", income: 320 },
  { day: "Tue", income: 410 },
  { day: "Wed", income: 380 },
  { day: "Thu", income: 520 },
  { day: "Fri", income: 490 },
  { day: "Sat", income: 0 },
  { day: "Today", income: 680 },
];

export const councilMessages = [
  "AAPL showing bullish divergence on 15-min — options flow confirms with $2.1M call sweep",
  "NVDA institutional accumulation detected at $870 support — volume 3x average",
  "SPY approaching key resistance at $515 — dealer gamma exposure flipping",
  "TSLA bearish RSI divergence — premium selling activity increasing on calls",
  "AMD pre-earnings IV elevated — calendar spread opportunity for theta capture",
  "QQQ put flow likely hedging, not directional — context: large equity portfolio protection",
];

export const incomeOpportunities = [
  { id: 1, title: "DoorDash - Peak Evening Hours", payout: "$28-$38/hr", location: "Local", time: "6-9 PM tonight", type: "Gig", note: "Highest demand hours in your area. Tips typically 20-30% of order." },
  { id: 2, title: "Upwork - Data Entry & Analysis", payout: "$25-$45/hr", location: "Remote", time: "Flexible", type: "Freelance", note: "Consistent demand. Start with smaller projects to build rating." },
  { id: 3, title: "Amazon Flex - Delivery Blocks", payout: "$22-$30/hr", location: "Local", time: "Morning blocks", type: "Gig", note: "Blocks release at 10PM for next day. Set alerts." },
  { id: 4, title: "Covered Call Income - AAPL", payout: "$140-$220/week", location: "Your portfolio", time: "Weekly expiry", type: "Options", note: "If you hold 100 shares, sell weekly calls 5-10% OTM for income." },
  { id: 5, title: "TaskRabbit - Furniture Assembly", payout: "$35-$55/hr", location: "Local", time: "Weekends", type: "Gig", note: "IKEA assembly is the highest demand category." },
  { id: 6, title: "Cash Secured Puts - AMD", payout: "$80-$150/week", location: "Your portfolio", time: "Weekly expiry", type: "Options", note: "Sell puts at price you'd want to buy anyway. Collect premium while waiting." },
];

export const agentLogMessages = [
  { time: "3:42 PM", message: "Price action analysis complete on NVDA — bull flag confirmed on 4H chart" },
  { time: "3:41 PM", message: "Options flow scan: $4.2M call sweep on NVDA 950C detected across CBOE + ISE" },
  { time: "3:40 PM", message: "Volume analysis: NVDA trading 2.8x average volume — institutional buying pattern" },
  { time: "3:39 PM", message: "Risk check: NVDA position would be 1.6% of portfolio at current sizing — within limits" },
  { time: "3:38 PM", message: "Sentiment scan: NVDA news sentiment 72% positive — no negative catalysts detected" },
  { time: "3:37 PM", message: "Cross-check complete: 4 of 5 methods agree on NVDA bullish — signal fired at 87% confidence" },
  { time: "3:35 PM", message: "Greeks analysis: AMD IV rank at 78th percentile — premium selling favorable" },
  { time: "3:34 PM", message: "TSLA RSI divergence flagged — bearish signal at 74% confidence. 1 method dissenting." },
  { time: "3:32 PM", message: "SPY approaching dealer gamma flip level at $515 — expect volatility expansion above this level" },
  { time: "3:30 PM", message: "Portfolio risk scan: total exposure 8.4% — well within 15% max allocation guideline" },
];

export const sectorData = [
  { sector: "Technology", ticker: "XLK", change: 2.4, weight: 32, volume: "High" },
  { sector: "Healthcare", ticker: "XLV", change: -0.8, weight: 14, volume: "Normal" },
  { sector: "Financials", ticker: "XLF", change: 1.2, weight: 12, volume: "High" },
  { sector: "Energy", ticker: "XLE", change: -1.5, weight: 8, volume: "Low" },
  { sector: "Consumer Disc.", ticker: "XLY", change: 0.6, weight: 11, volume: "Normal" },
  { sector: "Industrials", ticker: "XLI", change: 1.8, weight: 9, volume: "High" },
  { sector: "Real Estate", ticker: "XLRE", change: -0.3, weight: 5, volume: "Low" },
  { sector: "Utilities", ticker: "XLU", change: 0.2, weight: 4, volume: "Low" },
  { sector: "Materials", ticker: "XLB", change: -0.5, weight: 3, volume: "Normal" },
  { sector: "Telecom", ticker: "XLC", change: 0.9, weight: 2, volume: "Normal" },
];

export const fearGreedData = {
  value: 72,
  label: "Greed",
  previousClose: 65,
  weekAgo: 58,
  monthAgo: 45,
  components: [
    { name: "Market Momentum", value: 78, signal: "Greed" },
    { name: "Stock Strength", value: 65, signal: "Greed" },
    { name: "Put/Call Ratio", value: 72, signal: "Greed" },
    { name: "Market Volatility", value: 35, signal: "Fear" },
    { name: "Safe Haven Demand", value: 80, signal: "Extreme Greed" },
  ],
};

export const signalHistory = [
  { id: 1, date: "Apr 4", symbol: "NVDA", type: "BUY", entry: 845.00, exit: 875.20, pnl: 3.55, result: "win" as const, confidence: 87, holdTime: "2d" },
  { id: 2, date: "Apr 3", symbol: "TSLA", type: "SELL", entry: 205.00, exit: 198.45, pnl: 3.41, result: "win" as const, confidence: 74, holdTime: "1d" },
  { id: 3, date: "Apr 3", symbol: "AAPL", type: "BUY", entry: 178.00, exit: 175.84, pnl: -1.21, result: "loss" as const, confidence: 52, holdTime: "3d" },
  { id: 4, date: "Apr 2", symbol: "AMD", type: "BUY", entry: 155.00, exit: 162.75, pnl: 5.00, result: "win" as const, confidence: 83, holdTime: "3d" },
  { id: 5, date: "Apr 2", symbol: "META", type: "BUY", entry: 178.00, exit: 185.20, pnl: 4.04, result: "win" as const, confidence: 79, holdTime: "2d" },
  { id: 6, date: "Apr 1", symbol: "SPY", type: "SELL", entry: 515.00, exit: 512.45, pnl: 0.50, result: "win" as const, confidence: 68, holdTime: "4h" },
  { id: 7, date: "Apr 1", symbol: "MSFT", type: "BUY", entry: 415.00, exit: 412.30, pnl: -0.65, result: "loss" as const, confidence: 55, holdTime: "1d" },
  { id: 8, date: "Mar 31", symbol: "PLTR", type: "BUY", entry: 23.00, exit: 24.50, pnl: 6.52, result: "win" as const, confidence: 79, holdTime: "5d" },
  { id: 9, date: "Mar 30", symbol: "NFLX", type: "BUY", entry: 600.00, exit: 615.30, pnl: 2.55, result: "win" as const, confidence: 81, holdTime: "6d" },
  { id: 10, date: "Mar 29", symbol: "GOOGL", type: "BUY", entry: 480.00, exit: 485.90, pnl: 1.23, result: "win" as const, confidence: 72, holdTime: "7d" },
];

export const riskDimensions = [
  { dimension: "Market", value: 72, max: 100 },
  { dimension: "Sector", value: 55, max: 100 },
  { dimension: "Position", value: 85, max: 100 },
  { dimension: "Volatility", value: 60, max: 100 },
  { dimension: "Liquidity", value: 90, max: 100 },
  { dimension: "Correlation", value: 45, max: 100 },
];

export const terminalOrderFlow = [
  { time: "15:42:01", action: "BUY", symbol: "NVDA", size: "2,500", price: "875.20", exchange: "NASDAQ", type: "SWEEP" },
  { time: "15:41:58", action: "SELL", symbol: "SPY", size: "15,000", price: "512.45", exchange: "ARCA", type: "BLOCK" },
  { time: "15:41:55", action: "BUY", symbol: "AMD", size: "8,200", price: "162.75", exchange: "NYSE", type: "SWEEP" },
  { time: "15:41:52", action: "BUY", symbol: "AAPL", size: "3,100", price: "175.84", exchange: "BATS", type: "SPLIT" },
  { time: "15:41:48", action: "SELL", symbol: "TSLA", size: "5,800", price: "198.45", exchange: "NASDAQ", type: "BLOCK" },
  { time: "15:41:45", action: "BUY", symbol: "META", size: "4,500", price: "185.20", exchange: "NYSE", type: "SWEEP" },
  { time: "15:41:40", action: "BUY", symbol: "MSFT", size: "2,200", price: "412.30", exchange: "ARCA", type: "SPLIT" },
  { time: "15:41:35", action: "SELL", symbol: "QQQ", size: "12,000", price: "438.12", exchange: "BATS", type: "BLOCK" },
  { time: "15:41:30", action: "BUY", symbol: "AMZN", size: "1,800", price: "495.10", exchange: "NASDAQ", type: "SWEEP" },
  { time: "15:41:25", action: "BUY", symbol: "GOOGL", size: "3,400", price: "485.90", exchange: "NYSE", type: "SPLIT" },
];

export const terminalNewsFeed = [
  { time: "15:40", source: "Reuters", headline: "Fed minutes signal potential rate hold through Q3 2024", sentiment: "neutral" as const },
  { time: "15:38", source: "Bloomberg", headline: "NVDA datacenter revenue exceeds estimates by 22%", sentiment: "positive" as const },
  { time: "15:35", source: "CNBC", headline: "Treasury yields fall as inflation data comes in softer", sentiment: "positive" as const },
  { time: "15:32", source: "WSJ", headline: "China tech stocks rally on regulatory easing signals", sentiment: "positive" as const },
  { time: "15:28", source: "Reuters", headline: "Oil prices drop 2% on surprise inventory build", sentiment: "negative" as const },
  { time: "15:25", source: "Bloomberg", headline: "AMD announces next-gen AI chip to compete with NVDA", sentiment: "positive" as const },
  { time: "15:22", source: "FT", headline: "European banks face new capital requirements in 2025", sentiment: "negative" as const },
  { time: "15:18", source: "CNBC", headline: "Apple Vision Pro sales slower than expected in Q2", sentiment: "negative" as const },
];

export const terminalSystemLog = [
  { time: "15:42:03", level: "INFO", module: "ENTANGLE-CORE", message: "Quantum consensus reached: NVDA BUY @ 87% confidence — 5/6 models agree" },
  { time: "15:42:01", level: "DATA", module: "FLOW-SCANNER", message: "Detected $4.2M sweep on NVDA 950C 05/17 across 3 exchanges" },
  { time: "15:41:58", level: "WARN", module: "RISK-ENGINE", message: "Portfolio beta exposure elevated: 1.35 vs target 1.0" },
  { time: "15:41:55", level: "INFO", module: "PRICE-ACTION", message: "Bull flag breakout confirmed on NVDA 4H — volume 2.8x avg" },
  { time: "15:41:52", level: "INFO", module: "SENTIMENT", message: "Market sentiment index: 72/100 (Greed) — up from 65 yesterday" },
  { time: "15:41:48", level: "DATA", module: "GREEKS-ENGINE", message: "AMD IV rank: 78th percentile — theta premium elevated" },
  { time: "15:41:45", level: "WARN", module: "ENTANGLE-CORE", message: "TSLA signal conflict: 3 bearish, 2 bullish, 1 neutral — no consensus" },
  { time: "15:41:40", level: "INFO", module: "VOLUME-ANALYSIS", message: "SPY dark pool activity: 42% of volume — above average institutional flow" },
  { time: "15:41:35", level: "INFO", module: "RISK-ENGINE", message: "Max drawdown today: -0.8% — within tolerance (max -3%)" },
  { time: "15:41:30", level: "DATA", module: "FLOW-SCANNER", message: "QQQ put sweep $1.8M — flagged as hedge (correlated with equity position)" },
];

export const quantumNodes = [
  { id: "price", label: "Price Action", status: "active" as const, confidence: 92 },
  { id: "volume", label: "Volume", status: "active" as const, confidence: 88 },
  { id: "flow", label: "Options Flow", status: "active" as const, confidence: 95 },
  { id: "greeks", label: "Greeks", status: "active" as const, confidence: 78 },
  { id: "sentiment", label: "Sentiment", status: "warning" as const, confidence: 65 },
  { id: "risk", label: "Risk Mgmt", status: "active" as const, confidence: 90 },
];
