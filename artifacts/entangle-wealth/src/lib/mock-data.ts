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
