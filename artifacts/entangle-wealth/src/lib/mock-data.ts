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

export const analysisMethods = [
  { name: "Price Action", description: "Reads candlestick patterns, support/resistance, and market structure." },
  { name: "Volume Analysis", description: "Tracks institutional buying and selling through volume profiles." },
  { name: "Options Flow", description: "Monitors large premium sweeps and unusual open interest changes." },
  { name: "Greeks Analysis", description: "Evaluates Delta, Gamma, Theta, and Vega for options positioning." },
  { name: "Sentiment", description: "Gauges market mood from news, social data, and put/call ratios." },
  { name: "Risk Management", description: "Sizes positions using Kelly Criterion. Caps risk at 2% per trade." },
];
