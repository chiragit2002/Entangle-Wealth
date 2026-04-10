import { ssrHtmlShell, escHtml, SITE_URL } from "./ssrShared";

export interface TradingStrategy {
  name: string;
  slug: string;
  category: "momentum" | "swing" | "position" | "income" | "scalping" | "mean-reversion" | "breakout";
  difficulty: "beginner" | "intermediate" | "advanced";
  timeHorizon: string;
  description: string;
  howItWorks: string;
  entryRules: string[];
  exitRules: string[];
  riskManagement: string;
  bestMarketConditions: string;
  pros: string[];
  cons: string[];
  indicatorsUsed: string[];
  exampleSetup: string;
  relatedStrategies: string[];
}

const CAT_META: Record<string, { label: string; color: string }> = {
  momentum: { label: "Momentum", color: "cyan" },
  swing: { label: "Swing Trading", color: "gold" },
  position: { label: "Position Trading", color: "green" },
  income: { label: "Income", color: "purple" },
  scalping: { label: "Scalping", color: "red" },
  "mean-reversion": { label: "Mean Reversion", color: "cyan" },
  breakout: { label: "Breakout", color: "gold" },
};

const DIFF_COLORS: Record<string, string> = { beginner: "green", intermediate: "gold", advanced: "red" };

export const STRATEGIES: TradingStrategy[] = [
  {
    name: "Golden Cross Strategy",
    slug: "golden-cross",
    category: "momentum",
    difficulty: "beginner",
    timeHorizon: "Weeks to months",
    description: "A trend-following strategy that enters long positions when the 50-day SMA crosses above the 200-day SMA, signaling a shift from bearish to bullish momentum.",
    howItWorks: "The Golden Cross occurs when a shorter-term moving average (50 SMA) crosses above a longer-term moving average (200 SMA). This crossover signals that recent price momentum has turned bullish relative to the long-term trend. The strategy captures major trend reversals early, riding the new uptrend for weeks or months.",
    entryRules: ["50-day SMA crosses above 200-day SMA", "Price is above both moving averages", "Volume on crossover day exceeds 20-day average volume", "Wait for first pullback to 50 SMA for lower-risk entry"],
    exitRules: ["Death Cross: 50-day SMA crosses below 200-day SMA", "Price closes below 200-day SMA for 3 consecutive days", "Trailing stop at 2× ATR below the highest close"],
    riskManagement: "Initial stop-loss at the most recent swing low or 3% below entry. Risk no more than 2% of portfolio per trade. Scale in on pullbacks to the 50 SMA.",
    bestMarketConditions: "Best in transitioning markets moving from bearish to bullish. Works well in broad market recoveries and sector rotations. Avoid during choppy, range-bound markets where false crossovers occur frequently.",
    pros: ["Simple to identify and execute", "Catches major trend reversals", "Works across all liquid markets", "Low maintenance — hold for weeks/months"],
    cons: ["Lagging indicator — enters after significant move", "False signals in choppy markets", "Can miss quick V-bottom reversals", "Requires patience during consolidation phases"],
    indicatorsUsed: ["50-day SMA", "200-day SMA", "Volume", "ATR"],
    exampleSetup: "In March 2023, AAPL's 50-day SMA crossed above its 200-day SMA at $155. Entry on the pullback to $152 with stop at $145. The stock rallied to $195 over the next 4 months, capturing a 28% move.",
    relatedStrategies: ["death-cross-short", "ema-crossover", "trend-following-adx"],
  },
  {
    name: "RSI Reversal Strategy",
    slug: "rsi-reversal",
    category: "mean-reversion",
    difficulty: "intermediate",
    timeHorizon: "Days to weeks",
    description: "A mean-reversion strategy that identifies oversold bounces using RSI divergences combined with support levels and volume confirmation.",
    howItWorks: "When RSI drops below 30 and forms a bullish divergence (price makes a lower low while RSI makes a higher low), it signals exhaustion of selling pressure. Combined with a price test of a known support level and increasing volume on the bounce, this creates a high-probability reversal setup.",
    entryRules: ["RSI(14) drops below 30 then forms bullish divergence", "Price tests a known support level (prior swing low, Fibonacci, or round number)", "A bullish candlestick pattern forms at support (hammer, engulfing, morning star)", "Volume increases on the reversal candle"],
    exitRules: ["RSI reaches 60-70 (not overbought, capturing the mean reversion)", "Price reaches the next resistance level", "If RSI fails to confirm the bounce within 3 bars, exit at breakeven", "Time stop: exit if no progress after 10 trading days"],
    riskManagement: "Stop-loss 1% below the reversal candle's low. Position size: risk 1-2% of portfolio. Reduce position by 50% at first resistance.",
    bestMarketConditions: "Best in range-bound markets or during pullbacks within broader uptrends. Avoid in strong downtrends where RSI can remain oversold for extended periods. Works best on stocks with established trading ranges.",
    pros: ["High win rate when combined with support and volume", "Clear entry and exit criteria", "Works in multiple market conditions", "Good risk/reward ratio (often 2:1 or better)"],
    cons: ["RSI can stay oversold in strong downtrends", "Requires confirmation from multiple signals", "Not suitable for momentum-driven stocks", "May miss the absolute bottom"],
    indicatorsUsed: ["RSI(14)", "Volume", "Support/Resistance levels", "Candlestick patterns"],
    exampleSetup: "MSFT pulls back to $340 support. RSI drops to 25, then as price retests $340, RSI reads 28 (higher low = bullish divergence). A hammer candle forms on 1.5× average volume. Enter at $342, stop at $336, target $365.",
    relatedStrategies: ["stochastic-oversold", "bollinger-bounce", "mean-reversion-ema"],
  },
  {
    name: "MACD Momentum Strategy",
    slug: "macd-momentum",
    category: "momentum",
    difficulty: "intermediate",
    timeHorizon: "Days to weeks",
    description: "A momentum strategy that uses MACD crossovers combined with histogram expansion to identify and ride accelerating trends.",
    howItWorks: "When the MACD line crosses above the signal line and the histogram begins expanding (bars getting taller), it confirms accelerating bullish momentum. This strategy enters on the crossover and rides the trend as long as the histogram continues to expand. The exit comes when the histogram begins contracting, signaling decelerating momentum.",
    entryRules: ["MACD line crosses above signal line", "MACD histogram turns positive and expanding", "Price is above the 20-day EMA", "Volume is above the 10-day average"],
    exitRules: ["MACD histogram begins contracting (3 consecutive smaller bars)", "MACD line crosses below signal line", "Price closes below 20-day EMA", "Trailing stop at 1.5× ATR"],
    riskManagement: "Stop-loss at the low of the candle before the MACD crossover. Risk 1.5% of capital per trade. Add to position on histogram re-expansion after brief contraction.",
    bestMarketConditions: "Ideal in trending markets with clear directional moves. Works best when ADX is above 25 confirming trend strength. Avoid in choppy, low-ADX environments where MACD generates frequent false crossovers.",
    pros: ["Captures the meat of a momentum move", "Clear visual signals on the chart", "Histogram provides momentum quality assessment", "Works on multiple timeframes"],
    cons: ["Lagging signal — misses the first part of the move", "Frequent false signals in ranging markets", "Requires additional filters to improve accuracy", "Can give back profits during histogram contraction"],
    indicatorsUsed: ["MACD (12, 26, 9)", "20-day EMA", "Volume", "ADX"],
    exampleSetup: "NVDA shows MACD crossover above signal line at $450. Histogram expands for 8 consecutive bars as price rallies. Entry at $455, initial stop at $440. Histogram begins contracting at $510 — exit at $505 for 11% gain.",
    relatedStrategies: ["golden-cross", "ema-crossover", "trend-following-adx"],
  },
  {
    name: "Bollinger Band Squeeze",
    slug: "bollinger-squeeze",
    category: "breakout",
    difficulty: "intermediate",
    timeHorizon: "Days to 2 weeks",
    description: "A volatility breakout strategy that identifies periods of low volatility (band compression) to position for explosive directional moves.",
    howItWorks: "When Bollinger Bands narrow significantly (the squeeze), it signals that volatility has compressed to extreme lows. Like a coiled spring, this compression typically precedes a sharp directional move. The strategy enters when price breaks out of the squeeze, using the band width and Keltner Channel overlap to confirm the squeeze condition.",
    entryRules: ["Bollinger Band width reaches 6-month low", "Bands contract inside Keltner Channels (squeeze confirmation)", "Price breaks above upper band (bullish) or below lower band (bearish)", "Volume surges above 1.5× the 20-day average on the breakout candle"],
    exitRules: ["Bands begin to contract again after expansion", "Price reverses to the middle band (20 SMA)", "Trailing stop at the opposite Bollinger Band", "Target: measured move equal to the band width at breakout"],
    riskManagement: "Stop-loss at the middle band (20 SMA) on initial entry. Position size based on the distance from entry to stop. Risk 1-2% of capital.",
    bestMarketConditions: "Any market that experiences alternating periods of consolidation and trending. Particularly effective on stocks approaching earnings, FDA decisions, or other catalysts. The tighter the squeeze, the more powerful the breakout.",
    pros: ["Catches explosive moves early", "Clear, objective squeeze identification", "Works in any market direction", "Low risk relative to potential reward"],
    cons: ["False breakouts can occur", "Direction of breakout is unknown until it happens", "Requires patience during the squeeze phase", "Not effective in consistently trending markets"],
    indicatorsUsed: ["Bollinger Bands (20, 2)", "Keltner Channels", "Band Width indicator", "Volume"],
    exampleSetup: "AMZN consolidates for 3 weeks. Bollinger Bands narrow to the tightest width in 6 months. Price breaks above the upper band at $180 on 2× average volume. Enter at $182, stop at $175 (20 SMA), target $198.",
    relatedStrategies: ["keltner-breakout", "volatility-expansion", "range-breakout"],
  },
  {
    name: "Fibonacci Pullback Strategy",
    slug: "fibonacci-pullback",
    category: "swing",
    difficulty: "intermediate",
    timeHorizon: "1-3 weeks",
    description: "A swing trading strategy that enters on pullbacks to key Fibonacci retracement levels within an established uptrend, optimizing entry price.",
    howItWorks: "After identifying a strong impulse move, this strategy waits for a retracement to the 38.2%, 50%, or 61.8% Fibonacci level. The entry triggers when price shows a reversal pattern at these levels, which act as dynamic support. The 61.8% level (golden ratio) is the strongest, but also represents a deeper pullback.",
    entryRules: ["Identify a clear impulse wave (swing low to swing high)", "Wait for a retracement to 38.2%, 50%, or 61.8% Fibonacci level", "Look for a bullish reversal candle at the Fibonacci level", "RSI shows oversold condition or bullish divergence at the level", "Volume decreases during the pullback (healthy retracement)"],
    exitRules: ["Take partial profit at the prior swing high (100% extension)", "Full exit at the 127.2% or 161.8% Fibonacci extension", "Stop-loss below the next Fibonacci level (e.g., stop below 61.8% if entered at 50%)", "Exit if price closes below the 78.6% retracement"],
    riskManagement: "Stop-loss just below the next Fibonacci level. The 61.8% entry offers the best risk/reward but lowest hit rate. The 38.2% entry has the highest hit rate but smaller move potential. Risk 1.5% per trade.",
    bestMarketConditions: "Best in established uptrends with healthy pullbacks. The overall trend should be confirmed by moving averages (price above 50 and 200 SMA). Avoid during choppy markets where impulse waves are unclear.",
    pros: ["Optimizes entry within an existing trend", "Clear risk/reward framework", "Multiple entry opportunities (3 Fib levels)", "Fibonacci levels are self-fulfilling prophecies"],
    cons: ["Requires correctly identifying impulse waves", "Not all pullbacks respect Fibonacci levels", "Subjectivity in choosing swing points", "Can miss moves that retrace less than 38.2%"],
    indicatorsUsed: ["Fibonacci Retracement tool", "RSI", "Moving Averages", "Volume"],
    exampleSetup: "GOOGL rallies from $130 to $155 (impulse wave). It pulls back to $145.44 (the 38.2% retracement at $155 - 0.382 × $25). A bullish engulfing candle forms on declining volume. Enter at $146, stop at $142 (50% Fib), target $162 (127.2% extension).",
    relatedStrategies: ["golden-cross", "trend-following-adx", "support-bounce"],
  },
  {
    name: "Covered Call Income Strategy",
    slug: "covered-call-income",
    category: "income",
    difficulty: "intermediate",
    timeHorizon: "Monthly (rolling)",
    description: "An options income strategy that generates consistent premium income by selling call options against existing stock positions.",
    howItWorks: "The investor holds 100+ shares of a stock and sells out-of-the-money call options against the position each month. The premium received generates income regardless of stock direction. If the stock rises past the strike, shares are called away at a profit. If it stays below, the option expires worthless and a new call is sold.",
    entryRules: ["Own at least 100 shares of a liquid stock with options", "Sell 1 OTM call per 100 shares at 5-10% above current price", "Select expiration 30-45 days out for optimal time decay", "Choose a strike that balances premium income vs. upside capped"],
    exitRules: ["Let option expire worthless and sell a new call", "Buy back the call at 50% profit and sell a new one", "Roll up and out if stock approaches strike price", "Close if assignment is imminent and you want to keep shares"],
    riskManagement: "The stock position is the primary risk — the covered call does not protect against large downside moves. Consider buying a protective put (creating a collar) for downside protection. Only sell covered calls on stocks you are willing to hold long-term.",
    bestMarketConditions: "Best in sideways to mildly bullish markets. The ideal stock has moderate implied volatility (generates good premiums) but isn't overly volatile (risk of assignment). Avoid during strong uptrends when capping upside is costly.",
    pros: ["Generates consistent monthly income", "Reduces cost basis of stock over time", "Lower risk than naked options selling", "Works in flat markets where buy-and-hold doesn't"],
    cons: ["Caps upside if stock rallies past strike", "Does not protect against large declines", "Requires 100+ shares per contract", "Transaction costs on monthly rolling"],
    indicatorsUsed: ["Implied Volatility rank", "Delta (0.15-0.30 OTM)", "Days to expiration", "Support levels for stock selection"],
    exampleSetup: "Own 200 shares of AAPL at $175. Sell 2 AAPL $185 calls expiring in 35 days for $3.50 each ($700 total premium). If AAPL stays below $185, keep $700 (4% monthly return). If it rallies past $185, sell shares at $185 + keep $700.",
    relatedStrategies: ["cash-secured-put", "iron-condor", "wheel-strategy"],
  },
  {
    name: "Cash-Secured Put Strategy",
    slug: "cash-secured-put",
    category: "income",
    difficulty: "intermediate",
    timeHorizon: "Monthly (rolling)",
    description: "An options income strategy that sells put options on stocks you want to own, getting paid to wait for a lower entry price.",
    howItWorks: "The investor sells an out-of-the-money put option and sets aside cash equal to 100 × strike price. If the stock drops below the strike, they are assigned and buy the stock at a discount. If it stays above, they keep the premium. Either outcome is favorable: income or discounted stock purchase.",
    entryRules: ["Select a stock you want to own at a lower price", "Sell 1 OTM put at a strike price you would be happy buying at", "Choose 30-45 days to expiration", "Ensure implied volatility is above the 30th percentile for decent premium"],
    exitRules: ["Let expire worthless (keep premium) and sell a new put", "Buy back at 50% profit and sell new put at a later expiration", "Accept assignment if stock drops below strike", "Roll down and out if you want to avoid assignment temporarily"],
    riskManagement: "Have full cash to cover assignment (hence 'cash-secured'). Only sell puts on stocks you genuinely want to own. Max loss occurs if the stock goes to zero, minus the premium received.",
    bestMarketConditions: "Ideal in neutral to mildly bullish markets with elevated implied volatility. Works best on quality stocks with clear support levels. The premium income is highest when volatility is elevated (market fear).",
    pros: ["Get paid to wait for a lower entry price", "Income in flat/rising markets", "Lower effective cost basis than buying outright", "High probability strategy (typically 70-85% win rate)"],
    cons: ["Can be assigned in market crashes at unfavorable levels", "Ties up significant capital as collateral", "Limited profit to premium collected", "Requires margin account at most brokers"],
    indicatorsUsed: ["Implied Volatility rank", "Put delta (0.15-0.30)", "Support levels for strike selection", "Days to expiration"],
    exampleSetup: "Want to buy MSFT (currently at $410). Sell the $390 put expiring in 40 days for $5.50 ($550 premium). Set aside $39,000 cash. If MSFT stays above $390, keep $550. If it drops, buy 100 shares at an effective price of $384.50.",
    relatedStrategies: ["covered-call-income", "wheel-strategy", "iron-condor"],
  },
  {
    name: "The Wheel Strategy",
    slug: "wheel-strategy",
    category: "income",
    difficulty: "advanced",
    timeHorizon: "Ongoing (monthly cycles)",
    description: "A systematic options income strategy that combines cash-secured puts and covered calls in a repeating cycle, generating premium income while accumulating quality stocks.",
    howItWorks: "Phase 1: Sell cash-secured puts on a stock you want to own. Collect premium monthly. Phase 2: When assigned, switch to selling covered calls against the acquired shares. Continue collecting premium. Phase 3: When shares are called away, return to Phase 1. The 'wheel' keeps spinning, generating income at each phase.",
    entryRules: ["Select a liquid stock with weekly options and moderate IV", "Phase 1: Sell OTM put at 0.20-0.30 delta", "Phase 2 (after assignment): Sell OTM call at or above your cost basis", "30-45 DTE for each cycle"],
    exitRules: ["Phase 1: Let puts expire worthless or accept assignment", "Phase 2: Let calls expire worthless or accept assignment (shares called away)", "Restart cycle when shares are called away", "Pause if stock fundamentals deteriorate"],
    riskManagement: "Only wheel stocks you would happily own for years. Set aside full collateral for puts. The biggest risk is a large stock decline while holding shares. Consider stopping the wheel if the stock drops more than 25% from your assignment price.",
    bestMarketConditions: "Works in all market conditions but performs best in choppy, sideways markets where options premiums are collected consistently. Less effective in strong uptrends (shares get called away quickly) or crashes (holding losses).",
    pros: ["Generates income in all market phases", "Systematic and repeatable", "Reduces emotional decision-making", "Compounds returns over time"],
    cons: ["Capital intensive (need cash for put assignment)", "Can hold losing positions in downtrends", "Caps upside during strong rallies", "Requires active management each month"],
    indicatorsUsed: ["Implied Volatility percentile", "Delta for strike selection", "Moving averages for stock quality", "Support levels for put strikes"],
    exampleSetup: "Wheel on AMD: Sell $150 put for $4.00. Assigned at $150 (cost basis $146). Sell $155 call for $3.50. Called away at $155 (profit: $155 - $146 + $3.50 = $12.50 per share). Restart: sell $150 put again.",
    relatedStrategies: ["covered-call-income", "cash-secured-put", "iron-condor"],
  },
  {
    name: "Iron Condor Strategy",
    slug: "iron-condor",
    category: "income",
    difficulty: "advanced",
    timeHorizon: "2-6 weeks",
    description: "A neutral options strategy that profits from low volatility by selling both a call spread and a put spread, creating a wide profit zone.",
    howItWorks: "An iron condor sells an OTM call spread and an OTM put spread simultaneously. The four-leg structure creates a profit zone between the two short strikes. Maximum profit occurs when the stock expires between both short strikes. The strategy bets that the stock will stay within a range.",
    entryRules: ["Implied volatility rank above 50th percentile", "Sell OTM put spread (short put + long put below)", "Sell OTM call spread (short call + long call above)", "Select strikes at approximately 0.15-0.20 delta", "Enter with 30-45 days to expiration"],
    exitRules: ["Take profit at 50% of maximum profit", "Close if one side reaches 2× the initial credit", "Roll the tested side if price approaches a short strike", "Let expire if all strikes are OTM near expiration"],
    riskManagement: "Max risk is the width of the wider spread minus the total credit. Keep trade size to 3-5% of portfolio. Close early if one short strike is breached. Never let a spread go to full loss.",
    bestMarketConditions: "Ideal in high-IV, range-bound markets. Best when IV is elevated (rich premiums) and expected to decrease. Avoid before major catalysts (earnings, FDA, elections) unless that's the thesis.",
    pros: ["Profits from time decay in any neutral market", "Defined risk — max loss is known upfront", "High probability of profit (typically 60-70%)", "Can be adjusted by rolling tested sides"],
    cons: ["Limited profit potential", "Requires managing 4 option legs", "Can suffer large losses if range is broken", "Commissions on 4 legs eat into profits"],
    indicatorsUsed: ["Implied Volatility rank", "Expected Move for strike selection", "Bollinger Bands for range identification", "ATR for range width"],
    exampleSetup: "SPY at $500. Sell $480/$475 put spread and $520/$525 call spread for $2.00 total credit. Max profit: $200 per contract if SPY stays between $480-$520. Max risk: $300 per contract. Break-evens: $478 and $522.",
    relatedStrategies: ["covered-call-income", "cash-secured-put", "strangle"],
  },
  {
    name: "Gap and Go Strategy",
    slug: "gap-and-go",
    category: "momentum",
    difficulty: "intermediate",
    timeHorizon: "Intraday (minutes to hours)",
    description: "An intraday momentum strategy that trades stocks gapping up on news or earnings, capturing the continuation of pre-market momentum.",
    howItWorks: "When a stock gaps up significantly at the open (4%+ on volume), the Gap and Go strategy enters on the first pullback and bounce during the opening range. The thesis is that strong gaps on catalysts tend to continue in the gap direction, especially with institutional participation.",
    entryRules: ["Stock gaps up 4%+ on significant news or earnings", "Pre-market volume is at least 3× the daily average", "Wait for the first 5-minute candle to close", "Enter on the first pullback that holds above the opening price", "VWAP must be below current price (confirmation)"],
    exitRules: ["Take 50% profit at 2:1 risk/reward", "Trail remaining position with VWAP", "Exit if price falls below VWAP", "Close all positions by 11:30 AM if not trending"],
    riskManagement: "Stop-loss below the low of the first 5-minute candle or the pre-market low. Risk max 1% of capital per trade. Reduce size on gap fills (bearish sign).",
    bestMarketConditions: "Works best on high-momentum days with clear catalysts (earnings beats, FDA approvals, analyst upgrades). Market should be in a neutral or bullish state. Avoid on broad market selloff days.",
    pros: ["Fast profits in minutes to hours", "Clear catalyst-driven entries", "High momentum = high probability continuation", "Multiple opportunities each morning"],
    cons: ["High stress — fast decision-making required", "Gaps can reverse (gap fill)", "Requires real-time data and fast execution", "Discipline needed to cut losers quickly"],
    indicatorsUsed: ["VWAP", "Volume", "Pre-market levels", "5-minute chart"],
    exampleSetup: "PLTR gaps up 8% on strong earnings to $25. Pre-market volume is 5× average. First 5-min candle closes at $25.30. Price pulls back to $24.80, bounces above VWAP ($24.90). Enter at $25.00, stop at $24.50, target $26.00.",
    relatedStrategies: ["opening-range-breakout", "momentum-scalp", "vwap-bounce"],
  },
  {
    name: "VWAP Bounce Strategy",
    slug: "vwap-bounce",
    category: "scalping",
    difficulty: "intermediate",
    timeHorizon: "Intraday (minutes)",
    description: "An intraday mean-reversion scalp that enters when price pulls back to VWAP and bounces, using institutional flow as dynamic support.",
    howItWorks: "VWAP represents the average price weighted by volume — it's where institutional orders cluster. When an uptrending stock pulls back to VWAP, institutions often buy at this level, creating a bounce. This strategy scalps these bounces with tight risk management.",
    entryRules: ["Stock is in an intraday uptrend (above VWAP since open)", "Price pulls back to touch or slightly breach VWAP", "A bullish candle forms at VWAP (hammer or engulfing)", "Volume increases on the bounce candle", "Time is between 10:00 AM - 3:00 PM (avoid open and close volatility)"],
    exitRules: ["Target: previous intraday high or 1.5× risk", "Stop: below the VWAP touch candle low", "Exit if price closes below VWAP on 5-min chart", "Time stop: exit if no move within 15 minutes"],
    riskManagement: "Maximum risk 0.5% of capital per scalp. Use the 1-minute chart for entry, 5-minute for trend confirmation. Never average down on a VWAP break.",
    bestMarketConditions: "Works best on trending days where VWAP acts as clear support. Ideal for liquid stocks with average daily volume above 2 million shares. Less effective on choppy, low-volume days.",
    pros: ["Institutional-backed support level", "Clear entry and stop levels", "Multiple opportunities per day", "Works on any liquid stock"],
    cons: ["Small profit per trade", "Requires fast execution and real-time data", "VWAP breaks can lead to rapid losses", "High frequency = higher commission costs"],
    indicatorsUsed: ["VWAP", "Volume", "1-min and 5-min charts", "Relative volume"],
    exampleSetup: "TSLA trending above VWAP at $245. At 11:15 AM, price pulls back to VWAP at $243.50. A hammer candle forms on increased volume. Enter at $244, stop at $242.80, target $246 (previous high). Risk: $1.20, Reward: $2.00.",
    relatedStrategies: ["gap-and-go", "opening-range-breakout", "momentum-scalp"],
  },
  {
    name: "Opening Range Breakout (ORB)",
    slug: "opening-range-breakout",
    category: "breakout",
    difficulty: "intermediate",
    timeHorizon: "Intraday",
    description: "A systematic intraday strategy that trades the breakout from the first 15-30 minutes' trading range, capturing the day's directional bias.",
    howItWorks: "The first 15-30 minutes of trading establish the opening range (OR) — the high and low of that period. A breakout above the OR high suggests bullish bias for the day; below the OR low suggests bearish. The strategy enters on the breakout and targets a measured move equal to the OR height.",
    entryRules: ["Mark the high and low of the first 15-30 minutes", "Enter long on a break above OR high with volume confirmation", "Enter short on a break below OR low with volume confirmation", "Wait for a candle to close above/below (avoid wicks)", "Confirm with market direction (SPY/QQQ trend)"],
    exitRules: ["Target: 1× the opening range height from the breakout level", "Extended target: 2× the opening range height", "Stop-loss: opposite side of the opening range", "Close by 2:00 PM if target not hit"],
    riskManagement: "Risk is the height of the opening range. If the OR is too wide (>3% of stock price), skip the trade. Position size so that a full stop = 1% of capital.",
    bestMarketConditions: "Best on days with a clear catalyst or directional bias (economic data releases, earnings season). Works better on narrow opening ranges (tighter stops). Avoid on FOMC days and triple witching.",
    pros: ["Systematic and rules-based", "Identifies the day's directional bias early", "Works on any liquid stock or index", "Clear risk/reward structure"],
    cons: ["False breakouts are common", "Wide opening ranges = large stops", "Doesn't work on all days", "Requires first 30 minutes of patience"],
    indicatorsUsed: ["Opening Range (15-30 min high/low)", "Volume", "VWAP", "SPY/QQQ for market direction"],
    exampleSetup: "META opens and forms a 15-min range of $480-$485. At 10:02 AM, price breaks above $485 on 2× volume. Enter at $485.50, stop at $480 (OR low), target $490.50 (1× OR height above breakout).",
    relatedStrategies: ["gap-and-go", "vwap-bounce", "range-breakout"],
  },
  {
    name: "Trend Following with ADX",
    slug: "trend-following-adx",
    category: "position",
    difficulty: "intermediate",
    timeHorizon: "Weeks to months",
    description: "A trend-following strategy that uses the ADX indicator to confirm trend strength before entering, avoiding choppy markets that destroy trend traders.",
    howItWorks: "The ADX (Average Directional Index) measures trend strength from 0-100, regardless of direction. This strategy only enters trend trades when ADX confirms a strong trend (above 25). The +DI and -DI crossovers provide direction, while ADX confirms the trend has enough strength to follow.",
    entryRules: ["ADX crosses above 25 (trend confirmed)", "+DI crosses above -DI (bullish trend) or -DI above +DI (bearish)", "Price is above 50 SMA for long, below for short", "Volume supports the move (above 20-day average)"],
    exitRules: ["ADX drops below 20 (trend exhaustion)", "+DI/-DI crossover reverses", "Price crosses below the 50 SMA (for longs)", "Trailing stop at 2× ATR(14)"],
    riskManagement: "Initial stop at the most recent swing low/high. Trail the stop using 2× ATR. Risk 2% of portfolio per trade. Avoid entering when ADX is above 50 (trend may be exhausting).",
    bestMarketConditions: "Any market in a trending state. The ADX filter keeps you out of choppy, range-bound conditions. Works on stocks, ETFs, and commodities. Best during sector rotations and macro-driven trends.",
    pros: ["Filters out choppy markets systematically", "Combines trend direction and strength", "Works across all asset classes", "Reduces false signals vs. simple MA crossovers"],
    cons: ["ADX is a lagging indicator", "Can miss the beginning of trends", "ADX above 50 can lead to late entries", "Requires patience for ADX to confirm"],
    indicatorsUsed: ["ADX(14)", "+DI / -DI", "50-day SMA", "ATR(14)", "Volume"],
    exampleSetup: "XOM: ADX crosses above 25 as +DI crosses above -DI. Price is at $95 above the 50 SMA. Enter at $96, trailing stop at $90 (2× ATR). ADX reaches 40, price rallies to $115. ADX drops below 20 at $112. Exit at $112 for 16.7% gain.",
    relatedStrategies: ["golden-cross", "macd-momentum", "ema-crossover"],
  },
  {
    name: "EMA Crossover Strategy",
    slug: "ema-crossover",
    category: "swing",
    difficulty: "beginner",
    timeHorizon: "Days to weeks",
    description: "A simple trend-following strategy using 9-EMA and 21-EMA crossovers to capture short-to-medium-term swings with responsive entries.",
    howItWorks: "Exponential moving averages respond faster to price changes than simple moving averages. The 9-EMA crossing above the 21-EMA signals bullish momentum, while crossing below signals bearish. EMAs are preferred over SMAs for swing trading because they capture trend changes faster.",
    entryRules: ["9-EMA crosses above 21-EMA (bullish) or below (bearish)", "Price closes above both EMAs on the crossover day", "Preferably, both EMAs are sloping in the direction of the trade", "Volume on the crossover bar is above the 10-day average"],
    exitRules: ["9-EMA crosses back below (above for shorts) 21-EMA", "Price closes below 21-EMA for 2 consecutive days", "Trailing stop at 1.5× ATR", "Target previous resistance/support for take profit"],
    riskManagement: "Stop at the most recent swing low/high. Risk 1-2% per trade. Add to winners on pullbacks to the 9-EMA within a confirmed uptrend.",
    bestMarketConditions: "Works best in moderately trending markets. Not as reliable as the Golden Cross for major trends, but captures shorter swings. Avoid in choppy, range-bound conditions.",
    pros: ["Faster signals than SMA crossovers", "Simple to understand and execute", "Captures short-term swings", "Responsive to price changes"],
    cons: ["More false signals than longer-term crossovers", "Whipsaws in ranging markets", "Requires daily monitoring", "Not ideal for position trading"],
    indicatorsUsed: ["9-day EMA", "21-day EMA", "Volume", "ATR"],
    exampleSetup: "DIS: 9-EMA crosses above 21-EMA at $105. Both EMAs sloping up. Enter at $106 on higher-than-average volume. Stop at $101 (recent swing low). Price reaches $118 before 9-EMA crosses below 21-EMA. Exit at $116.",
    relatedStrategies: ["golden-cross", "macd-momentum", "trend-following-adx"],
  },
  {
    name: "Support Bounce Strategy",
    slug: "support-bounce",
    category: "swing",
    difficulty: "beginner",
    timeHorizon: "Days to 2 weeks",
    description: "A swing trading strategy that buys at well-defined support levels with tight stops, offering favorable risk/reward on high-probability setups.",
    howItWorks: "When a stock in an uptrend pulls back to a well-established support level (tested 2+ times previously), buyers historically step in. This strategy enters at support with a tight stop just below, targeting the next resistance level for a 2:1+ risk/reward ratio.",
    entryRules: ["Stock is in an uptrend (above 50 SMA)", "Price reaches a support level that has held at least 2 times before", "A bullish reversal candle forms at support (hammer, engulfing, doji)", "Volume is decreasing on the pullback (healthy retracement)", "RSI is below 40 but not oversold (room to run)"],
    exitRules: ["Target: the next resistance level (prior high)", "Stop: 1-2% below the support level", "Exit if volume spikes on a support break", "Time stop: exit if no bounce within 5 trading days"],
    riskManagement: "Stop-loss just below support. Risk 1-2% of capital. Position size based on the distance from entry to stop. Consider scaling in at multiple support touches.",
    bestMarketConditions: "Best in range-bound or mildly bullish markets with well-defined support and resistance. The broader market should not be in a downtrend. Works on stocks with clear horizontal trading ranges.",
    pros: ["Simple and visual — easy to identify", "Excellent risk/reward (tight stop)", "High win rate when combined with trend", "Works on any timeframe"],
    cons: ["Support can break in strong downtrends", "Subjectivity in identifying support levels", "May require multiple tests before entry", "Limited to range-bound or trending-up stocks"],
    indicatorsUsed: ["Horizontal support levels", "Volume", "RSI", "50-day SMA", "Candlestick patterns"],
    exampleSetup: "JPM has bounced off $185 support 3 times in the past 2 months. Price pulls back to $186, forms a hammer on decreasing volume. Enter at $187, stop at $183 (below support), target $200 (resistance). Risk: $4, Reward: $13 (3.25:1).",
    relatedStrategies: ["fibonacci-pullback", "rsi-reversal", "bollinger-bounce"],
  },
  {
    name: "Bollinger Band Bounce",
    slug: "bollinger-bounce",
    category: "mean-reversion",
    difficulty: "beginner",
    timeHorizon: "2-7 days",
    description: "A mean-reversion strategy that buys when price touches the lower Bollinger Band and sells at the middle or upper band.",
    howItWorks: "Bollinger Bands contain approximately 95% of price action within 2 standard deviations of the 20-period SMA. When price touches the lower band, it is statistically extreme and likely to revert to the mean (middle band). This strategy buys at the lower band and targets the middle or upper band.",
    entryRules: ["Price touches or pierces the lower Bollinger Band", "RSI is below 35 (confirming oversold)", "A bullish reversal candle forms (hammer, engulfing)", "Overall trend is neutral or bullish (price above 200 SMA)", "Volume is not spiking on heavy selling (avoid capitulation)"],
    exitRules: ["Target 1: Middle band (20 SMA) for conservative exit", "Target 2: Upper band for aggressive exit", "Stop: 1% below the lower band touch point", "Exit if price continues below the lower band for 2 closes"],
    riskManagement: "Stop below the lower band. Position size so that a stop = 1% of capital. Take partial profits at the middle band. Only hold to upper band in strong uptrends.",
    bestMarketConditions: "Best in range-bound to mildly bullish markets. Bands should be relatively stable (not squeezing or expanding rapidly). Works best on stocks with a history of mean-reverting behavior.",
    pros: ["High probability — price reverts to mean ~68% of the time", "Clear, visual entry and exit levels", "Simple for beginners to understand", "Works on multiple timeframes"],
    cons: ["Fails in strong downtrends (price walks the lower band)", "Lower band can be a stepping stone for further decline", "Requires trend filter to avoid bear markets", "Small wins if only targeting the middle band"],
    indicatorsUsed: ["Bollinger Bands (20, 2)", "RSI(14)", "200-day SMA", "Volume"],
    exampleSetup: "COST at $750. Lower Bollinger Band at $735. Price touches $734, RSI at 28, hammer candle forms. Enter at $737, stop at $728, target $752 (middle band). Risk: $9, Reward: $15 (1.67:1).",
    relatedStrategies: ["rsi-reversal", "support-bounce", "mean-reversion-ema"],
  },
  {
    name: "Breakout and Retest Strategy",
    slug: "breakout-retest",
    category: "breakout",
    difficulty: "intermediate",
    timeHorizon: "Days to weeks",
    description: "A breakout strategy that waits for the initial breakout, then enters on the retest of the broken level, reducing false breakout risk.",
    howItWorks: "Instead of chasing the initial breakout (high false breakout rate), this strategy waits for price to break through resistance, pull back to retest the broken level (now support), and then enters when the retest holds. This confirms the breakout is legitimate and offers a better entry price.",
    entryRules: ["Price breaks above a clear resistance level on strong volume", "Wait for a pullback to the broken resistance (now support)", "A bullish candle forms at the retest level", "Volume on the retest should be lower than the breakout volume", "The pullback should hold above the broken level"],
    exitRules: ["Target: measured move equal to the consolidation height", "Extended target: 2× the consolidation height", "Stop: below the retested level by 1-2%", "Exit if the retest fails (price closes back below the broken level)"],
    riskManagement: "Stop just below the retested level. This offers tighter stops than entering on the initial breakout. Risk 1-2% of capital. Only enter if the retest occurs within 5 trading days of the breakout.",
    bestMarketConditions: "Works in any market condition but best when the broader market is bullish and the stock has a clear technical pattern (ascending triangle, rectangle, cup and handle). Avoid breakouts against the larger trend.",
    pros: ["Lower false breakout rate than chasing initial breakout", "Better entry price (buying the pullback)", "Tighter stops = better risk/reward", "Confirms institutional participation"],
    cons: ["Not all breakouts retest (you may miss moves)", "Requires patience after the initial breakout", "Retest level selection can be subjective", "Some retests fail and become failed breakouts"],
    indicatorsUsed: ["Support/Resistance levels", "Volume", "Candlestick patterns", "Moving averages"],
    exampleSetup: "NFLX breaks above $600 resistance on 2× volume, rallying to $615. Two days later, it pulls back to $602 (retesting $600). A bullish engulfing candle forms on lower volume. Enter at $604, stop at $595, target $630 (measured move).",
    relatedStrategies: ["range-breakout", "bollinger-squeeze", "fibonacci-pullback"],
  },
  {
    name: "Range Breakout Strategy",
    slug: "range-breakout",
    category: "breakout",
    difficulty: "beginner",
    timeHorizon: "Days to weeks",
    description: "A breakout strategy that identifies stocks consolidating in a defined range and trades the breakout when price escapes the range with volume.",
    howItWorks: "When a stock trades between a clear support and resistance for an extended period (2+ weeks), it builds energy like a coiled spring. A breakout from this range, confirmed by volume, often leads to a measured move equal to the range height. The strategy enters on the breakout and uses the range height as the profit target.",
    entryRules: ["Stock has traded in a defined range for at least 2 weeks", "Price breaks above resistance (long) or below support (short)", "Breakout candle closes beyond the range boundary", "Volume on breakout is at least 1.5× the 20-day average", "ADX is rising, confirming emerging trend"],
    exitRules: ["Target: range height added to breakout point", "Stop: inside the range (halfway or at the opposite boundary)", "Exit if price re-enters the range within 2 bars", "Trail stop at the 20-day SMA after initial move"],
    riskManagement: "Stop at the midpoint of the range for tighter risk, or at the opposite boundary for wider stop. Risk 1-2% of capital. Consider partial entry on breakout and adding on successful retest.",
    bestMarketConditions: "Works in transitioning markets — from consolidation to trending. Best when the broader market supports the breakout direction. Longer consolidation periods typically produce more powerful breakouts.",
    pros: ["Clear, visual pattern", "Defined risk and reward", "Works in any market direction", "Simple to identify and trade"],
    cons: ["False breakouts are common (50-60% of breakouts fail)", "Requires patience during consolidation", "Volume confirmation is essential", "May need multiple attempts to catch a real breakout"],
    indicatorsUsed: ["Horizontal S/R levels", "Volume", "ADX", "20-day SMA"],
    exampleSetup: "V has traded between $270-$285 for 4 weeks. Price breaks above $285 on 2× volume. Enter at $286, stop at $277.50 (range midpoint), target $300 ($285 + $15 range height). Risk: $8.50, Reward: $14 (1.65:1).",
    relatedStrategies: ["breakout-retest", "bollinger-squeeze", "opening-range-breakout"],
  },
  {
    name: "Mean Reversion EMA Strategy",
    slug: "mean-reversion-ema",
    category: "mean-reversion",
    difficulty: "intermediate",
    timeHorizon: "3-10 days",
    description: "A swing trading strategy that buys stocks that have deviated significantly from their 20-day EMA, betting on a snap-back to the mean.",
    howItWorks: "Stocks tend to oscillate around their moving averages. When a stock stretches more than 2 standard deviations below its 20-day EMA, it's statistically likely to snap back. This strategy quantifies the deviation and enters when the mean-reversion probability is highest.",
    entryRules: ["Price is more than 2 standard deviations below the 20-day EMA", "RSI(2) is below 10 (extreme oversold on short-term RSI)", "The stock is in a long-term uptrend (above 200-day SMA)", "A reversal candle forms (engulfing, hammer, or inside bar breakout)", "Not immediately before earnings or major catalysts"],
    exitRules: ["Exit when price reaches the 20-day EMA", "RSI(2) crosses above 70", "3-day trailing stop at the low of the prior bar", "Time stop: exit after 10 trading days regardless"],
    riskManagement: "Stop at the swing low or 3% below entry. Risk 1% of capital per trade. The long-term uptrend filter (200 SMA) is critical — never mean-revert in a downtrend.",
    bestMarketConditions: "Best during market pullbacks within larger uptrends. Works when fear is elevated (VIX spike) but the fundamental backdrop remains positive. Avoid during genuine bear markets where mean reversion fails.",
    pros: ["Statistically validated approach", "Buys fear and panic at a discount", "High win rate when trend filter is applied", "Short holding period reduces exposure"],
    cons: ["Can buy into a falling knife without trend filter", "Small gains per trade", "Requires strict discipline on stops", "Not all deviations mean-revert"],
    indicatorsUsed: ["20-day EMA", "200-day SMA", "RSI(2)", "Standard deviation bands", "Candlestick patterns"],
    exampleSetup: "AAPL drops 8% in 3 days, falling 2.5 standard deviations below its 20 EMA. RSI(2) at 5. Price at $165, 20 EMA at $178, 200 SMA at $170. Hammer candle forms. Enter at $166, stop at $161, target $178 (20 EMA). Risk: $5, Reward: $12 (2.4:1).",
    relatedStrategies: ["rsi-reversal", "bollinger-bounce", "support-bounce"],
  },
  {
    name: "Momentum Scalping Strategy",
    slug: "momentum-scalp",
    category: "scalping",
    difficulty: "advanced",
    timeHorizon: "Minutes",
    description: "A high-frequency scalping strategy that captures small momentum bursts using Level 2 data, time and sales, and 1-minute charts.",
    howItWorks: "Momentum scalping targets stocks with strong intraday momentum (relative volume 3×+, clear direction). The trader watches Level 2 order flow for large buyers/sellers and enters with the dominant flow, holding for quick 0.5-2% moves. Speed and discipline are paramount.",
    entryRules: ["Relative volume above 3× (unusual activity)", "Clear direction on 1-minute chart (higher highs or lower lows)", "Large bid/ask imbalance on Level 2 favoring the trade direction", "Time and sales showing large block trades in the direction", "Price is above VWAP for longs, below for shorts"],
    exitRules: ["Target: 0.5-1% move from entry", "Stop: 0.3% from entry (tight stops essential)", "Exit if Level 2 order flow reverses", "Never hold through a pause in momentum", "Hard stop: exit after 5 minutes if no move"],
    riskManagement: "Extremely tight stops — 0.3% maximum. Risk 0.5% of capital per trade. Use hotkeys for instant execution. Never hold losing scalps hoping for a reversal.",
    bestMarketConditions: "Pre-market movers with catalysts, earnings reactions, and stocks with unusual volume. Best during the first 90 minutes and last 30 minutes of trading when volume is highest.",
    pros: ["Many opportunities per day", "Small risk per trade", "Not affected by overnight risk", "Profits compound with multiple winners"],
    cons: ["Extremely stressful and fast-paced", "High commission costs", "Requires professional tools (L2, DMA)", "Most traders lose money scalping"],
    indicatorsUsed: ["Level 2 order book", "Time and Sales", "VWAP", "1-minute chart", "Relative Volume"],
    exampleSetup: "SOFI gaps up 5% on earnings. Relative volume 8×. Level 2 shows stacked bids at $9.50 with large blocks buying. Enter at $9.55 as bids lift offers. Stop at $9.40. Sell at $9.75 as momentum pauses. Profit: $0.20/share in 3 minutes.",
    relatedStrategies: ["vwap-bounce", "gap-and-go", "opening-range-breakout"],
  },
  {
    name: "Sector Rotation Strategy",
    slug: "sector-rotation",
    category: "position",
    difficulty: "advanced",
    timeHorizon: "Months",
    description: "A macro strategy that rotates capital between sectors based on the business cycle, capturing outperformance as economic conditions shift.",
    howItWorks: "Different sectors outperform at different stages of the economic cycle. Early recovery favors financials and consumer discretionary. Mid-cycle favors technology and industrials. Late-cycle favors energy and materials. Recession favors healthcare and utilities. This strategy shifts allocations to match the current cycle phase.",
    entryRules: ["Identify current business cycle phase using economic indicators", "Compare sector relative strength (RS) to SPY", "Enter sectors showing improving RS at the start of their favorable phase", "Use sector ETFs for diversified exposure", "Confirm with leading economic indicators (yield curve, PMI, housing starts)"],
    exitRules: ["Exit when sector's RS begins declining relative to SPY", "Rotate to the next cycle-appropriate sectors", "Exit all when recession indicators trigger (inverted yield curve + rising unemployment)", "Annual rebalance at minimum, quarterly preferred"],
    riskManagement: "Diversify across 3-4 sectors at any time. Use sector ETFs rather than individual stocks to reduce single-stock risk. Maintain a core position in SPY for market-weight exposure.",
    bestMarketConditions: "Works across all market conditions — the strategy adapts to the cycle. Most valuable during major economic transitions (recovery to expansion, expansion to contraction). Less differentiated in mid-cycle when many sectors perform similarly.",
    pros: ["Captures macro-level alpha", "Reduces drawdowns by avoiding late-cycle sectors", "Backed by decades of economic research", "Works with simple ETF implementation"],
    cons: ["Requires macroeconomic knowledge", "Business cycle timing is imprecise", "Sectors can decouple from historical patterns", "Rebalancing creates tax events"],
    indicatorsUsed: ["Relative Strength vs. SPY", "Yield curve", "PMI (Purchasing Managers Index)", "Sector ETF performance", "Leading Economic Index"],
    exampleSetup: "Late 2022: Yield curve inverts, PMI declining. Rotate from Technology (XLK) and Consumer Discretionary (XLY) into Healthcare (XLV) and Utilities (XLU). Early 2023: Recovery signals emerge. Rotate into Financials (XLF) and Consumer Discretionary (XLY).",
    relatedStrategies: ["trend-following-adx", "relative-strength-momentum", "pairs-trading"],
  },
  {
    name: "Pairs Trading Strategy",
    slug: "pairs-trading",
    category: "mean-reversion",
    difficulty: "advanced",
    timeHorizon: "Days to weeks",
    description: "A market-neutral strategy that simultaneously goes long one stock and short a correlated stock when their price ratio deviates from the historical mean.",
    howItWorks: "Two highly correlated stocks (e.g., KO and PEP, or GOOGL and META) typically maintain a stable price ratio. When this ratio deviates beyond 2 standard deviations from its mean, the strategy bets on mean reversion — going long the underperformer and short the outperformer. The trade profits when the ratio normalizes, regardless of overall market direction.",
    entryRules: ["Identify two stocks with correlation > 0.80 over 1 year", "Calculate the price ratio (Stock A / Stock B)", "Enter when ratio deviates > 2 standard deviations from 60-day mean", "Long the underperformer, short the outperformer", "Dollar-neutral: equal dollar amounts on each side"],
    exitRules: ["Exit when ratio returns to the mean", "Take partial profit at 1 standard deviation", "Stop-loss at 3 standard deviations (ratio worsening)", "Time stop: exit after 20 trading days"],
    riskManagement: "Position sizing ensures dollar neutrality ($10K long / $10K short). Max loss occurs if divergence widens permanently (correlation breakdown). Avoid pairs with fundamental reasons for divergence (one company's earnings collapse).",
    bestMarketConditions: "Works in all market conditions — the strategy is market-neutral. Best during normal market conditions when correlations are stable. Avoid during market regime changes or when one stock has a unique catalyst.",
    pros: ["Market neutral — profits regardless of market direction", "Statistically backed mean-reversion approach", "Reduces overall portfolio risk", "Can be combined with other strategies"],
    cons: ["Correlation can break down permanently", "Requires short selling capability", "Complex to manage two simultaneous positions", "Margin requirements for the short side"],
    indicatorsUsed: ["Price ratio", "Correlation coefficient", "Standard deviation of ratio", "Z-score", "Bollinger Bands on the ratio"],
    exampleSetup: "KO at $60, PEP at $170. Ratio = 0.353 (mean = 0.340, 2 SD = 0.360). Ratio hits 0.365 — KO overperforming. Short $10K KO, Long $10K PEP. Ratio reverts to 0.340 in 2 weeks. Profit on both legs as they converge.",
    relatedStrategies: ["sector-rotation", "mean-reversion-ema", "iron-condor"],
  },
  {
    name: "Relative Strength Momentum",
    slug: "relative-strength-momentum",
    category: "momentum",
    difficulty: "advanced",
    timeHorizon: "Weeks to months",
    description: "A systematic momentum strategy that ranks stocks by relative strength and buys the strongest performers, rebalancing monthly to ride sustained momentum.",
    howItWorks: "Research shows that stocks with the strongest relative performance over the past 6-12 months tend to continue outperforming over the next 1-3 months (momentum factor). This strategy ranks a universe of stocks by their 6-month return, buys the top decile, and rebalances monthly. It systematically captures the momentum premium.",
    entryRules: ["Rank all stocks in the universe by 6-month price return", "Buy the top 10-20 stocks (highest momentum)", "Equal-weight or risk-parity allocation", "Exclude stocks below $10 or average volume below 500K (liquidity filter)", "Skip the most recent month's return to avoid mean reversion (1-month skip)"],
    exitRules: ["Monthly rebalance: sell stocks that drop out of top 20%", "Replace with new top-ranked stocks", "Exit all positions if SPY is below its 200-day SMA (trend filter)", "Exit individual stock if it gaps down more than 15% (thesis broken)"],
    riskManagement: "Diversify across 10-20 positions. Apply a market trend filter (only invest when SPY > 200 SMA). Risk per position: 5-10% of portfolio. Total equity exposure: 0-100% based on market trend.",
    bestMarketConditions: "Best in trending bull markets where momentum is rewarded. The strategy underperforms in choppy, mean-reverting markets and during momentum crashes (sharp reversals). The market trend filter mitigates downside during bear markets.",
    pros: ["Academically validated momentum premium", "Systematic and unemotional", "Captures the strongest trends", "Works across markets and asset classes"],
    cons: ["Momentum crashes (sharp reversals) can cause large drawdowns", "High turnover = tax inefficiency", "Underperforms in choppy markets", "Requires monthly rebalancing discipline"],
    indicatorsUsed: ["6-month price return", "200-day SMA (market filter)", "Average daily volume", "Relative strength ranking"],
    exampleSetup: "Screen NASDAQ 100 stocks. Top 10 by 6-month return: NVDA (+80%), META (+65%), AMZN (+45%), etc. Buy equal-weight $10K each. Next month: NVDA stays, NFLX enters top 10, COST drops out. Rebalance accordingly.",
    relatedStrategies: ["sector-rotation", "golden-cross", "trend-following-adx"],
  },
];

export function getStrategyBySlug(slug: string): TradingStrategy | undefined {
  return STRATEGIES.find(s => s.slug === slug);
}

export function getStrategyHtml(slug: string): string | null {
  const s = getStrategyBySlug(slug);
  if (!s) return null;

  const catMeta = CAT_META[s.category] || { label: s.category, color: "cyan" };
  const diffColor = DIFF_COLORS[s.difficulty] || "cyan";

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: s.name,
    description: s.description,
    url: `${SITE_URL}/strategies/${s.slug}`,
    step: [
      { "@type": "HowToStep", position: 1, name: "Identify Entry Conditions", text: s.entryRules.join(". ") },
      { "@type": "HowToStep", position: 2, name: "Execute the Trade", text: s.howItWorks },
      { "@type": "HowToStep", position: 3, name: "Manage Risk", text: s.riskManagement },
      { "@type": "HowToStep", position: 4, name: "Exit the Position", text: s.exitRules.join(". ") },
    ],
  });

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <span class="tag tag-${catMeta.color}">${catMeta.label}</span>
      <span class="tag tag-${diffColor}">${s.difficulty}</span>
    </div>
    <h1>${escHtml(s.name)}</h1>
    <p>${escHtml(s.description)}</p>
    <p style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:8px;">Time Horizon: <span class="mono" style="color:#FFD700;">${escHtml(s.timeHorizon)}</span></p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:800px;margin:0 auto;">

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">How It Works</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.howItWorks)}</p>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#00e676;">Entry Rules</h2>
          <ol style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:14px;padding-left:20px;">
            ${s.entryRules.map(r => `<li style="margin-bottom:8px;">${escHtml(r)}</li>`).join("")}
          </ol>
        </div>
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#ff3366;">Exit Rules</h2>
          <ol style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:14px;padding-left:20px;">
            ${s.exitRules.map(r => `<li style="margin-bottom:8px;">${escHtml(r)}</li>`).join("")}
          </ol>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">⚠ Risk Management</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.riskManagement)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#a855f7;">Best Market Conditions</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.bestMarketConditions)}</p>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#00e676;">Pros</h2>
          <ul style="list-style:none;padding:0;">
            ${s.pros.map(p => `<li style="color:rgba(255,255,255,0.7);font-size:14px;padding:6px 0;display:flex;gap:8px;align-items:baseline;"><span style="color:#00e676;font-size:10px;">●</span> ${escHtml(p)}</li>`).join("")}
          </ul>
        </div>
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#ff3366;">Cons</h2>
          <ul style="list-style:none;padding:0;">
            ${s.cons.map(c => `<li style="color:rgba(255,255,255,0.7);font-size:14px;padding:6px 0;display:flex;gap:8px;align-items:baseline;"><span style="color:#ff3366;font-size:10px;">●</span> ${escHtml(c)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">Example Setup</h2>
        <div style="background:rgba(0,212,255,0.05);border-radius:12px;padding:20px;border:1px solid rgba(0,212,255,0.1);">
          <p style="color:rgba(255,255,255,0.8);line-height:1.8;font-size:14px;font-family:'JetBrains Mono',monospace;">${escHtml(s.exampleSetup)}</p>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:rgba(255,255,255,0.5);">Indicators Used</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${s.indicatorsUsed.map(i => `<span class="tag tag-cyan">${escHtml(i)}</span>`).join("")}
        </div>
      </div>

      ${s.relatedStrategies.length ? `
      <div class="glass-card">
        <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:rgba(255,255,255,0.5);">Related Strategies</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${s.relatedStrategies.map(rs => {
            const related = STRATEGIES.find(x => x.slug === rs);
            return related ? `<a href="/strategies/${rs}" style="text-decoration:none;"><span class="tag tag-gold">${escHtml(related.name)}</span></a>` : "";
          }).join("")}
        </div>
      </div>` : ""}

    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${s.name} — Trading Strategy Guide | EntangleWealth`,
    description: s.description,
    canonical: `${SITE_URL}/strategies/${s.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Strategies", url: `${SITE_URL}/strategies` },
      { name: s.name, url: `${SITE_URL}/strategies/${s.slug}` },
    ],
  });
}

export function getStrategyIndexHtml(): string {
  const grouped = new Map<string, TradingStrategy[]>();
  for (const s of STRATEGIES) {
    const arr = grouped.get(s.category) || [];
    arr.push(s);
    grouped.set(s.category, arr);
  }

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Trading Strategies Guide",
    description: `${STRATEGIES.length} proven trading strategies with entry rules, exit rules, risk management, and real examples.`,
    url: `${SITE_URL}/strategies`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: STRATEGIES.length,
      itemListElement: STRATEGIES.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: `${SITE_URL}/strategies/${s.slug}`,
      })),
    },
  });

  const categoryOrder = ["momentum", "swing", "breakout", "mean-reversion", "income", "position", "scalping"];

  const body = `
  <div class="hero-section">
    <span class="tag tag-gold" style="margin-bottom:16px;">Trading Mastery</span>
    <h1>Trading Strategies Guide</h1>
    <p>${STRATEGIES.length} proven trading strategies with complete entry rules, exit rules, risk management, and real examples. From beginner-friendly to advanced systematic approaches.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    ${categoryOrder.filter(cat => grouped.has(cat)).map(cat => {
      const items = grouped.get(cat)!;
      const meta = CAT_META[cat] || { label: cat, color: "cyan" };
      return `
      <div style="margin-bottom:48px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span class="tag tag-${meta.color}">${meta.label}</span>
          <span style="color:rgba(255,255,255,0.3);font-size:13px;">${items.length} strategies</span>
        </div>
        <div class="grid-3">
          ${items.map(s => {
            const diffColor = DIFF_COLORS[s.difficulty] || "cyan";
            return `
          <a href="/strategies/${s.slug}" style="text-decoration:none;">
            <div class="glass-card" style="height:100%;">
              <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;">${escHtml(s.name)}</h3>
              <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin-bottom:12px;">${escHtml(s.description.slice(0, 140))}...</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="tag tag-${diffColor}">${s.difficulty}</span>
                <span style="color:rgba(255,255,255,0.3);font-size:11px;font-family:'JetBrains Mono',monospace;">${escHtml(s.timeHorizon)}</span>
              </div>
            </div>
          </a>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return ssrHtmlShell({
    title: `Trading Strategies Guide — ${STRATEGIES.length} Proven Methods | EntangleWealth`,
    description: `Master ${STRATEGIES.length} trading strategies from momentum and swing trading to options income and scalping. Complete entry/exit rules, risk management, and real examples.`,
    canonical: `${SITE_URL}/strategies`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Strategies", url: `${SITE_URL}/strategies` },
    ],
  });
}
