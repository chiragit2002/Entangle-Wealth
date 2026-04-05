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
  { id: 1, symbol: "NVDA", price: 875.20, type: "BUY", confidence: 95 },
  { id: 2, symbol: "AAPL", price: 175.84, type: "HOLD", confidence: 55 },
  { id: 3, symbol: "TSLA", price: 198.45, type: "SELL", confidence: 82 },
  { id: 4, symbol: "PLTR", price: 24.50, type: "BUY", confidence: 88 },
  { id: 5, symbol: "COIN", price: 23.10, type: "BUY", confidence: 76 },
];

export const optionsAlerts = [
  { id: 1, symbol: "SPY", strike: 515, type: "CALL", exp: "2024-05-17", volSpike: true, premium: "$2.5M" },
  { id: 2, symbol: "QQQ", strike: 430, type: "PUT", exp: "2024-05-17", volSpike: true, premium: "$1.8M" },
  { id: 3, symbol: "NVDA", strike: 900, type: "CALL", exp: "2024-06-21", volSpike: false, premium: "$4.2M" },
  { id: 4, symbol: "AMD", strike: 200, type: "CALL", exp: "2024-05-24", volSpike: true, premium: "$950K" },
];

export const unusualOptionsActivity = [
  { id: 1, symbol: "TSLA", strike: 210, type: "CALL", exp: "2024-05-17", delta: 0.35, gamma: 0.05, theta: -0.12, ivRank: 85, strength: 92, time: "10:45 AM" },
  { id: 2, symbol: "AAPL", strike: 170, type: "PUT", exp: "2024-05-17", delta: -0.42, gamma: 0.06, theta: -0.08, ivRank: 45, strength: 65, time: "11:12 AM" },
  { id: 3, symbol: "META", strike: 500, type: "CALL", exp: "2024-06-21", delta: 0.28, gamma: 0.03, theta: -0.15, ivRank: 72, strength: 88, time: "11:30 AM" },
  { id: 4, symbol: "MSFT", strike: 400, type: "PUT", exp: "2024-05-24", delta: -0.55, gamma: 0.08, theta: -0.09, ivRank: 30, strength: 52, time: "1:15 PM" },
  { id: 5, symbol: "NVDA", strike: 950, type: "CALL", exp: "2024-05-17", delta: 0.45, gamma: 0.07, theta: -0.22, ivRank: 95, strength: 98, time: "2:45 PM" },
];