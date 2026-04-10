import { ssrHtmlShell, escHtml, slugify, SITE_URL } from "./ssrShared";

export interface GlossaryTerm {
  term: string;
  slug: string;
  definition: string;
  category: "basics" | "trading" | "options" | "technical" | "fundamental" | "risk" | "crypto" | "fixed-income";
  difficulty: "beginner" | "intermediate" | "advanced";
  related: string[];
  example?: string;
  formula?: string;
  keyPoints: string[];
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  basics: { label: "Market Basics", color: "cyan" },
  trading: { label: "Trading", color: "green" },
  options: { label: "Options", color: "gold" },
  technical: { label: "Technical Analysis", color: "purple" },
  fundamental: { label: "Fundamental Analysis", color: "cyan" },
  risk: { label: "Risk Management", color: "red" },
  crypto: { label: "Crypto", color: "gold" },
  "fixed-income": { label: "Fixed Income", color: "green" },
};

export const TERMS: GlossaryTerm[] = [
  { term: "Ask Price", slug: "ask-price", definition: "The lowest price a seller is willing to accept for a security. Also known as the offer price, it represents the supply side of the bid-ask spread. When you place a market buy order, you typically pay the ask price.", category: "basics", difficulty: "beginner", related: ["bid-price", "bid-ask-spread", "market-order"], keyPoints: ["Represents the minimum acceptable selling price", "Higher than the bid price", "Narrows in liquid markets"], example: "If AAPL shows a bid of $150.00 and an ask of $150.05, you would pay $150.05 to buy immediately." },
  { term: "Bid Price", slug: "bid-price", definition: "The highest price a buyer is willing to pay for a security. It represents the demand side of the market. When you place a market sell order, you typically receive the bid price.", category: "basics", difficulty: "beginner", related: ["ask-price", "bid-ask-spread", "limit-order"], keyPoints: ["Represents maximum buying price", "Always lower than ask price", "Reflects current demand"] },
  { term: "Bid-Ask Spread", slug: "bid-ask-spread", definition: "The difference between the highest bid price and the lowest ask price for a security. It represents the transaction cost of trading and is a key measure of market liquidity. Tighter spreads indicate more liquid markets.", category: "basics", difficulty: "beginner", related: ["bid-price", "ask-price", "liquidity", "market-maker"], keyPoints: ["Wider spreads = less liquidity", "Narrows during high-volume trading", "Revenue source for market makers"], formula: "Spread = Ask Price - Bid Price" },
  { term: "Market Order", slug: "market-order", definition: "An order to buy or sell a security immediately at the best available current price. Market orders prioritize execution speed over price, guaranteeing the trade will be filled but not the exact price.", category: "trading", difficulty: "beginner", related: ["limit-order", "stop-order", "slippage"], keyPoints: ["Guarantees execution, not price", "Best for liquid securities", "Can experience slippage in volatile markets"] },
  { term: "Limit Order", slug: "limit-order", definition: "An order to buy or sell a security at a specific price or better. A buy limit order executes at the limit price or lower, while a sell limit order executes at the limit price or higher. Unlike market orders, limit orders are not guaranteed to fill.", category: "trading", difficulty: "beginner", related: ["market-order", "stop-order", "good-till-canceled"], keyPoints: ["Controls execution price", "May not fill if price isn't reached", "Useful in volatile markets"] },
  { term: "Stop-Loss Order", slug: "stop-loss-order", definition: "An order placed to sell a security when it reaches a certain price, designed to limit an investor's loss. Once the stop price is reached, the stop order becomes a market order and executes at the next available price.", category: "risk", difficulty: "beginner", related: ["trailing-stop", "limit-order", "risk-management"], keyPoints: ["Automates downside protection", "Becomes market order when triggered", "Can be triggered by brief dips"] },
  { term: "Trailing Stop", slug: "trailing-stop", definition: "A dynamic stop-loss order that adjusts automatically as the price moves in your favor. It maintains a fixed distance (dollar or percentage) from the highest price reached, locking in profits while allowing upside.", category: "risk", difficulty: "intermediate", related: ["stop-loss-order", "risk-management", "volatility"], keyPoints: ["Adjusts upward with price gains", "Locks in profits automatically", "Distance can be set as $ or %"], example: "Buy NVDA at $100 with a 10% trailing stop. If it rises to $150, your stop is at $135. If it drops to $135, you sell." },
  { term: "Options", slug: "options", definition: "Financial derivatives that give the holder the right, but not the obligation, to buy (call) or sell (put) an underlying asset at a predetermined strike price before or on the expiration date. Options are used for hedging, income generation, and speculation.", category: "options", difficulty: "intermediate", related: ["call-option", "put-option", "strike-price", "expiration-date", "premium"], keyPoints: ["Right without obligation", "Expire on a specific date", "Leverage amplifies gains and losses"] },
  { term: "Call Option", slug: "call-option", definition: "A contract giving the holder the right to buy the underlying asset at the strike price before expiration. Call buyers profit when the underlying price rises above the strike price plus the premium paid. Call sellers (writers) collect premium and profit when the price stays below the strike.", category: "options", difficulty: "intermediate", related: ["put-option", "strike-price", "covered-call", "premium"], keyPoints: ["Right to buy at strike price", "Profits from price increases", "Maximum loss limited to premium paid"] },
  { term: "Put Option", slug: "put-option", definition: "A contract giving the holder the right to sell the underlying asset at the strike price before expiration. Put buyers profit when the underlying price falls below the strike price minus the premium paid. Puts are commonly used as portfolio insurance.", category: "options", difficulty: "intermediate", related: ["call-option", "strike-price", "protective-put", "premium"], keyPoints: ["Right to sell at strike price", "Profits from price decreases", "Used for hedging downside risk"] },
  { term: "Strike Price", slug: "strike-price", definition: "The fixed price at which the holder of an option can buy (call) or sell (put) the underlying security. The relationship between the strike price and the current market price determines whether an option is in-the-money, at-the-money, or out-of-the-money.", category: "options", difficulty: "beginner", related: ["options", "in-the-money", "out-of-the-money"], keyPoints: ["Fixed at contract creation", "Determines option moneyness", "Multiple strikes available per expiration"] },
  { term: "Premium", slug: "premium", definition: "The price paid by the buyer to the seller (writer) of an option contract. It represents the cost of acquiring the rights granted by the option. Premium is influenced by intrinsic value, time value, volatility, and interest rates.", category: "options", difficulty: "beginner", related: ["options", "intrinsic-value", "time-decay", "implied-volatility"], keyPoints: ["Paid upfront by buyer", "Income for option seller", "Decays as expiration approaches"] },
  { term: "Implied Volatility", slug: "implied-volatility", definition: "A metric derived from option prices that reflects the market's expectation of future price movement in the underlying asset. Higher IV means the market expects larger price swings. IV is a key input in options pricing models like Black-Scholes.", category: "options", difficulty: "advanced", related: ["historical-volatility", "vix", "options", "premium"], keyPoints: ["Forward-looking volatility measure", "Rises before earnings/events", "Higher IV = more expensive options"], formula: "Derived from Black-Scholes model by solving for σ given the market price" },
  { term: "Greeks", slug: "greeks", definition: "A set of risk metrics used to measure the sensitivity of an option's price to various factors. The primary Greeks are Delta (price sensitivity), Gamma (delta sensitivity), Theta (time decay), Vega (volatility sensitivity), and Rho (interest rate sensitivity).", category: "options", difficulty: "advanced", related: ["delta", "gamma", "theta", "vega", "options"], keyPoints: ["Quantify option risk dimensions", "Essential for portfolio hedging", "Change continuously with market conditions"] },
  { term: "Delta", slug: "delta", definition: "Measures the rate of change in an option's price for a $1 move in the underlying asset. Call deltas range from 0 to 1; put deltas range from -1 to 0. Delta also approximates the probability of expiring in-the-money.", category: "options", difficulty: "advanced", related: ["greeks", "gamma", "options", "hedge-ratio"], keyPoints: ["Ranges from -1 to +1", "Approximates ITM probability", "Used for delta-neutral hedging"], formula: "Δ = ∂V/∂S" },
  { term: "Theta", slug: "theta", definition: "Measures the rate of time decay in an option's value per day. All else being equal, options lose value as expiration approaches. Theta is typically negative for option buyers and positive for option sellers.", category: "options", difficulty: "advanced", related: ["greeks", "time-decay", "premium", "options"], keyPoints: ["Accelerates near expiration", "Benefits option sellers", "Highest for ATM options"], formula: "Θ = ∂V/∂t" },
  { term: "Covered Call", slug: "covered-call", definition: "An options strategy where an investor holds a long position in a stock and sells (writes) call options against that position to generate income from the premium. The stock holding 'covers' the obligation if the call is exercised.", category: "options", difficulty: "intermediate", related: ["call-option", "premium", "options", "income-strategy"], keyPoints: ["Generates income from existing holdings", "Caps upside at strike price", "Reduces cost basis of stock position"], example: "Own 100 shares of AAPL at $150. Sell 1 $160 call for $3. If AAPL stays below $160, you keep the $300 premium." },
  { term: "Moving Average", slug: "moving-average", definition: "A technical indicator that smooths price data by creating a constantly updated average price over a specific period. Simple Moving Average (SMA) weights all prices equally; Exponential Moving Average (EMA) gives more weight to recent prices.", category: "technical", difficulty: "beginner", related: ["ema", "sma", "golden-cross", "death-cross"], keyPoints: ["Identifies trend direction", "Acts as dynamic support/resistance", "Crossovers generate trading signals"], formula: "SMA = (P₁ + P₂ + ... + Pₙ) / n" },
  { term: "RSI", slug: "rsi", definition: "The Relative Strength Index is a momentum oscillator that measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions. RSI ranges from 0 to 100, with readings above 70 suggesting overbought and below 30 suggesting oversold.", category: "technical", difficulty: "intermediate", related: ["macd", "stochastic", "momentum", "overbought"], keyPoints: ["Ranges from 0 to 100", "Above 70 = potentially overbought", "Below 30 = potentially oversold", "Divergences signal potential reversals"], formula: "RSI = 100 - [100 / (1 + RS)], where RS = Avg Gain / Avg Loss" },
  { term: "MACD", slug: "macd", definition: "Moving Average Convergence Divergence is a trend-following momentum indicator that shows the relationship between two exponential moving averages (typically 12 and 26 periods). The MACD line, signal line, and histogram together identify trend changes and momentum shifts.", category: "technical", difficulty: "intermediate", related: ["ema", "moving-average", "signal-line", "momentum"], keyPoints: ["Combines trend and momentum analysis", "Signal line crossovers generate trades", "Histogram shows momentum strength"], formula: "MACD Line = EMA(12) - EMA(26); Signal = EMA(9) of MACD" },
  { term: "Bollinger Bands", slug: "bollinger-bands", definition: "A volatility indicator consisting of a middle band (typically 20-period SMA) with upper and lower bands set at a specified number of standard deviations (usually 2) from the middle band. The bands expand during volatile periods and contract during calm periods.", category: "technical", difficulty: "intermediate", related: ["standard-deviation", "moving-average", "volatility", "squeeze"], keyPoints: ["Adaptive to market volatility", "95% of price action within 2 SD bands", "Band squeeze signals breakout potential"], formula: "Upper Band = SMA(20) + 2σ; Lower Band = SMA(20) - 2σ" },
  { term: "Volume", slug: "volume", definition: "The total number of shares or contracts traded during a given period. Volume is a measure of market activity and liquidity. High volume confirms price moves; low volume suggests weak conviction. Volume precedes price — it often increases before a breakout.", category: "basics", difficulty: "beginner", related: ["liquidity", "volume-profile", "on-balance-volume"], keyPoints: ["Confirms price trend strength", "High volume = strong conviction", "Often spikes at support/resistance levels"] },
  { term: "Support Level", slug: "support-level", definition: "A price level where buying interest is strong enough to prevent the price from declining further. Support acts as a floor — when price approaches it, buyers step in. The more times a support level is tested without breaking, the stronger it becomes.", category: "technical", difficulty: "beginner", related: ["resistance-level", "trend-line", "breakout"], keyPoints: ["Floor where buying emerges", "Stronger with more tests", "Becomes resistance if broken"] },
  { term: "Resistance Level", slug: "resistance-level", definition: "A price level where selling pressure is strong enough to prevent the price from rising further. Resistance acts as a ceiling. When broken with strong volume, previous resistance often becomes new support.", category: "technical", difficulty: "beginner", related: ["support-level", "breakout", "trend-line"], keyPoints: ["Ceiling where selling emerges", "Breakout above signals bullish move", "Becomes support once broken"] },
  { term: "P/E Ratio", slug: "pe-ratio", definition: "The Price-to-Earnings ratio measures a company's current share price relative to its per-share earnings. It indicates how much investors are willing to pay per dollar of earnings. A high P/E may suggest overvaluation or high growth expectations.", category: "fundamental", difficulty: "beginner", related: ["eps", "peg-ratio", "valuation", "forward-pe"], keyPoints: ["Most common valuation metric", "Compare within same industry", "Forward P/E uses estimated earnings"], formula: "P/E = Stock Price / Earnings Per Share" },
  { term: "EPS", slug: "eps", definition: "Earnings Per Share represents the portion of a company's profit allocated to each outstanding share of common stock. It is a key profitability metric used in valuation ratios like P/E. Diluted EPS accounts for stock options and convertible securities.", category: "fundamental", difficulty: "beginner", related: ["pe-ratio", "revenue", "net-income"], keyPoints: ["Key profitability metric", "Drives P/E ratio", "Diluted EPS is more conservative"], formula: "EPS = (Net Income - Preferred Dividends) / Shares Outstanding" },
  { term: "Market Cap", slug: "market-cap", definition: "Market capitalization is the total market value of a company's outstanding shares. It classifies companies into size categories: mega-cap ($200B+), large-cap ($10-200B), mid-cap ($2-10B), small-cap ($250M-2B), and micro-cap (under $250M).", category: "fundamental", difficulty: "beginner", related: ["shares-outstanding", "enterprise-value"], keyPoints: ["Quick measure of company size", "Changes with stock price", "Used for index classification"], formula: "Market Cap = Share Price × Shares Outstanding" },
  { term: "Dividend Yield", slug: "dividend-yield", definition: "The annual dividend payment expressed as a percentage of the stock price. It measures the income return on an investment. High yields may indicate value or signal financial distress if unsustainable.", category: "fundamental", difficulty: "beginner", related: ["dividend", "payout-ratio", "income-investing"], keyPoints: ["Income return on investment", "Compare to sector average", "Unsustainably high yields are red flags"], formula: "Dividend Yield = Annual Dividend / Stock Price × 100" },
  { term: "Short Selling", slug: "short-selling", definition: "An investment strategy where an investor borrows shares and sells them, hoping to buy them back later at a lower price. The difference between the sell price and the buy-back price is the profit. Short selling has theoretically unlimited risk since the price can rise indefinitely.", category: "trading", difficulty: "intermediate", related: ["short-squeeze", "margin", "risk-management"], keyPoints: ["Profits from price declines", "Unlimited theoretical risk", "Requires margin account", "Can trigger short squeezes"] },
  { term: "Short Squeeze", slug: "short-squeeze", definition: "A rapid price increase that occurs when a heavily shorted stock rises, forcing short sellers to buy back shares to cover their positions. This buying pressure creates a feedback loop that drives the price even higher.", category: "trading", difficulty: "intermediate", related: ["short-selling", "short-interest", "gamma-squeeze"], keyPoints: ["Feedback loop of forced buying", "Triggered by high short interest", "Can cause extreme price spikes"], example: "GameStop (GME) in January 2021 surged over 1,700% as retail traders squeezed institutional short sellers." },
  { term: "Liquidity", slug: "liquidity", definition: "The ease with which an asset can be bought or sold without significantly affecting its price. High liquidity means tight bid-ask spreads, high volume, and minimal slippage. Major stocks like AAPL and MSFT are highly liquid.", category: "basics", difficulty: "beginner", related: ["bid-ask-spread", "volume", "slippage", "market-depth"], keyPoints: ["Ease of trading without price impact", "Higher in large-cap stocks", "Lower during off-hours"] },
  { term: "Slippage", slug: "slippage", definition: "The difference between the expected price of a trade and the actual execution price. Slippage occurs in fast-moving markets or with large orders in illiquid securities. It can be positive (better price) or negative (worse price).", category: "trading", difficulty: "intermediate", related: ["market-order", "liquidity", "bid-ask-spread"], keyPoints: ["Gap between expected and actual price", "Worse in illiquid markets", "Reduced with limit orders"] },
  { term: "Margin", slug: "margin", definition: "Borrowed money from a broker used to purchase securities. Margin trading amplifies both gains and losses. Regulation T requires a minimum 50% initial margin for stocks. Maintenance margin (typically 25%) must be maintained to avoid a margin call.", category: "trading", difficulty: "intermediate", related: ["margin-call", "leverage", "short-selling"], keyPoints: ["Amplifies gains and losses", "Interest charged on borrowed funds", "Margin calls force liquidation"] },
  { term: "ETF", slug: "etf", definition: "An Exchange-Traded Fund is a pooled investment security that tracks an index, commodity, sector, or strategy. ETFs trade on exchanges like stocks, offering diversification at low cost. Popular examples include SPY (S&P 500), QQQ (Nasdaq 100), and VTI (Total Market).", category: "basics", difficulty: "beginner", related: ["index-fund", "diversification", "expense-ratio"], keyPoints: ["Trades like a stock on exchanges", "Provides instant diversification", "Lower fees than mutual funds"] },
  { term: "Diversification", slug: "diversification", definition: "A risk management strategy that mixes a variety of investments within a portfolio. The rationale is that different assets react differently to market conditions, reducing overall portfolio risk. Diversification cannot eliminate systematic (market) risk.", category: "risk", difficulty: "beginner", related: ["portfolio", "correlation", "asset-allocation", "risk-management"], keyPoints: ["Reduces unsystematic risk", "Across asset classes and sectors", "Cannot eliminate market risk"] },
  { term: "Beta", slug: "beta", definition: "A measure of a stock's volatility relative to the overall market. A beta of 1 means the stock moves with the market. Beta > 1 indicates higher volatility; beta < 1 indicates lower volatility. Beta < 0 indicates inverse correlation.", category: "risk", difficulty: "intermediate", related: ["alpha", "volatility", "capm", "systematic-risk"], keyPoints: ["Measures relative market risk", "Beta 1 = market-like movement", "High-beta stocks are more volatile"], formula: "β = Cov(Rᵢ, Rₘ) / Var(Rₘ)" },
  { term: "Alpha", slug: "alpha", definition: "The excess return of an investment relative to a benchmark index. Positive alpha indicates outperformance; negative alpha indicates underperformance. Alpha is the holy grail of active management — consistent alpha generation is extremely difficult.", category: "risk", difficulty: "intermediate", related: ["beta", "benchmark", "sharpe-ratio", "active-management"], keyPoints: ["Measures excess return over benchmark", "Positive alpha = outperformance", "Difficult to sustain long-term"], formula: "α = Rₚ - [Rₑ + β(Rₘ - Rₑ)]" },
  { term: "Sharpe Ratio", slug: "sharpe-ratio", definition: "A risk-adjusted performance metric that measures excess return per unit of total risk (standard deviation). Higher Sharpe ratios indicate better risk-adjusted returns. A Sharpe ratio above 1 is generally considered good; above 2 is excellent.", category: "risk", difficulty: "advanced", related: ["sortino-ratio", "standard-deviation", "risk-adjusted-return"], keyPoints: ["Risk-adjusted return measure", "Above 1 = good, above 2 = excellent", "Uses total risk (not just downside)"], formula: "Sharpe = (Rₚ - Rₑ) / σₚ" },
  { term: "Sortino Ratio", slug: "sortino-ratio", definition: "A variation of the Sharpe ratio that only considers downside volatility rather than total volatility. This makes it a better measure for investors who are primarily concerned with downside risk, as it doesn't penalize upside volatility.", category: "risk", difficulty: "advanced", related: ["sharpe-ratio", "downside-risk", "risk-adjusted-return"], keyPoints: ["Only penalizes downside volatility", "Better than Sharpe for asymmetric returns", "Preferred for option strategies"], formula: "Sortino = (Rₚ - Rₑ) / σᴅ (downside deviation)" },
  { term: "Candlestick Chart", slug: "candlestick-chart", definition: "A type of financial chart that displays the open, high, low, and close prices for a specific period. Each 'candle' shows the price range with the body representing open-to-close and wicks showing high-low extremes. Green/white candles indicate price increase; red/black indicate decrease.", category: "technical", difficulty: "beginner", related: ["ohlc", "volume", "chart-patterns"], keyPoints: ["Shows OHLC in single bar", "Color indicates direction", "Patterns predict reversals"] },
  { term: "Golden Cross", slug: "golden-cross", definition: "A bullish chart pattern that occurs when a shorter-term moving average (typically 50-day SMA) crosses above a longer-term moving average (typically 200-day SMA). It signals a potential shift from a downtrend to an uptrend.", category: "technical", difficulty: "intermediate", related: ["death-cross", "moving-average", "trend-reversal"], keyPoints: ["50-day SMA crosses above 200-day SMA", "Bullish trend reversal signal", "Confirmed by increasing volume"] },
  { term: "Death Cross", slug: "death-cross", definition: "A bearish chart pattern that occurs when a shorter-term moving average (typically 50-day SMA) crosses below a longer-term moving average (typically 200-day SMA). It signals a potential shift from an uptrend to a downtrend.", category: "technical", difficulty: "intermediate", related: ["golden-cross", "moving-average", "trend-reversal"], keyPoints: ["50-day SMA crosses below 200-day SMA", "Bearish trend reversal signal", "Not always reliable as standalone signal"] },
  { term: "VIX", slug: "vix", definition: "The CBOE Volatility Index, known as the 'fear gauge,' measures the market's expectation of 30-day volatility implied by S&P 500 index options. VIX rises when investors expect turbulence and falls during calm markets. VIX above 30 typically indicates high fear.", category: "risk", difficulty: "intermediate", related: ["implied-volatility", "options", "fear-gauge"], keyPoints: ["Measures expected market volatility", "Rises during market stress", "VIX > 30 = elevated fear", "Inverse correlation with S&P 500"] },
  { term: "Fibonacci Retracement", slug: "fibonacci-retracement", definition: "A technical analysis tool that uses horizontal lines to indicate areas of support or resistance at key Fibonacci levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) before the price continues in the original direction. Based on the mathematical Fibonacci sequence.", category: "technical", difficulty: "intermediate", related: ["support-level", "resistance-level", "golden-ratio"], keyPoints: ["Key levels: 38.2%, 50%, 61.8%", "Marks potential reversal zones", "Used with other confirmation signals"] },
  { term: "Dollar-Cost Averaging", slug: "dollar-cost-averaging", definition: "An investment strategy where a fixed dollar amount is invested at regular intervals regardless of the asset's price. This reduces the impact of volatility by buying more shares when prices are low and fewer when prices are high.", category: "basics", difficulty: "beginner", related: ["diversification", "long-term-investing", "volatility"], keyPoints: ["Reduces timing risk", "Automatic disciplined investing", "Lowers average cost in volatile markets"], example: "Invest $500 into SPY every month. When SPY is $400, you buy 1.25 shares. When it's $500, you buy 1 share." },
  { term: "Breakout", slug: "breakout", definition: "A price movement through an identified level of support or resistance, usually accompanied by increased volume. Breakouts signal the start of a new trend. False breakouts (fakeouts) occur when price briefly crosses but quickly reverses.", category: "technical", difficulty: "intermediate", related: ["support-level", "resistance-level", "volume", "false-breakout"], keyPoints: ["Price exceeds key level", "Confirmed by high volume", "Watch for false breakouts"] },
  { term: "Gap", slug: "gap", definition: "A gap occurs when a stock's price opens significantly higher or lower than its previous close with no trading in between. Gaps can be caused by earnings reports, news events, or overnight sentiment changes. Types include breakaway, runaway, and exhaustion gaps.", category: "technical", difficulty: "intermediate", related: ["breakout", "volume", "opening-price"], keyPoints: ["Price discontinuity between sessions", "Often caused by news/earnings", "Some gaps fill, others don't"] },
  { term: "Bull Market", slug: "bull-market", definition: "A market condition characterized by rising prices, typically defined as a 20% or greater increase from recent lows. Bull markets are driven by economic growth, low unemployment, and investor optimism. The average bull market lasts about 4.4 years.", category: "basics", difficulty: "beginner", related: ["bear-market", "market-cycle", "trend"], keyPoints: ["20%+ rise from recent lows", "Driven by economic optimism", "Average duration ~4.4 years"] },
  { term: "Bear Market", slug: "bear-market", definition: "A market condition characterized by falling prices, typically defined as a 20% or greater decline from recent highs. Bear markets are associated with economic recessions, rising unemployment, and investor pessimism. The average bear market lasts about 9.6 months.", category: "basics", difficulty: "beginner", related: ["bull-market", "correction", "recession"], keyPoints: ["20%+ decline from recent highs", "Often accompanies recession", "Average duration ~9.6 months"] },
  { term: "Hedge", slug: "hedge", definition: "An investment position intended to offset potential losses from another position. Common hedging strategies include buying put options, short selling correlated assets, or using inverse ETFs. Perfect hedges are rare and costly.", category: "risk", difficulty: "intermediate", related: ["put-option", "risk-management", "diversification"], keyPoints: ["Reduces portfolio risk", "Has a cost (premium, opportunity)", "Not meant to generate profit"] },
  { term: "Stochastic Oscillator", slug: "stochastic-oscillator", definition: "A momentum indicator comparing a stock's closing price to its price range over a given period (typically 14 days). It generates values between 0 and 100. Readings above 80 are considered overbought; below 20 are oversold.", category: "technical", difficulty: "intermediate", related: ["rsi", "momentum", "overbought", "oversold"], keyPoints: ["Ranges 0-100", "Above 80 = overbought", "Below 20 = oversold", "%K and %D line crossovers signal trades"], formula: "%K = (Close - Low₁₄) / (High₁₄ - Low₁₄) × 100" },
  { term: "On-Balance Volume", slug: "on-balance-volume", definition: "A cumulative volume-based indicator that adds volume on up days and subtracts it on down days. OBV is used to confirm price trends — rising OBV with rising price confirms an uptrend. Divergences between OBV and price can signal reversals.", category: "technical", difficulty: "intermediate", related: ["volume", "accumulation-distribution", "volume-profile"], keyPoints: ["Cumulative volume indicator", "Confirms price trends", "Divergences signal reversals"], formula: "OBV = Previous OBV + (Volume if close > prev close, -Volume if close < prev close)" },
  { term: "Risk-Reward Ratio", slug: "risk-reward-ratio", definition: "The ratio between the potential loss (risk) and potential profit (reward) of a trade. A 1:3 risk-reward ratio means risking $1 to potentially make $3. Professional traders typically target ratios of at least 1:2.", category: "risk", difficulty: "beginner", related: ["stop-loss-order", "take-profit", "risk-management"], keyPoints: ["Defines trade quality", "Target at least 1:2", "Higher ratios allow lower win rates"], formula: "R:R = (Entry - Stop Loss) / (Target - Entry)" },
  { term: "Volatility", slug: "volatility", definition: "A statistical measure of the dispersion of returns for a given security or market index. Higher volatility means larger price swings. Historical volatility is calculated from past prices; implied volatility is derived from options prices.", category: "risk", difficulty: "beginner", related: ["standard-deviation", "beta", "vix", "implied-volatility"], keyPoints: ["Measure of price fluctuation", "Historical vs implied", "Higher volatility = higher risk and opportunity"] },
  { term: "Expense Ratio", slug: "expense-ratio", definition: "The annual fee charged by a fund (ETF or mutual fund) as a percentage of assets under management. It covers management, administrative, and operating costs. Index funds typically have expense ratios below 0.10%; actively managed funds charge 0.50-1.50%.", category: "basics", difficulty: "beginner", related: ["etf", "index-fund", "mutual-fund"], keyPoints: ["Annual fund operating cost", "Lower = better for returns", "Index funds < 0.10% typical"] },
  { term: "VWAP", slug: "vwap", definition: "Volume Weighted Average Price is the average price weighted by volume, calculated from the open of trading. It is used as a benchmark for trade execution quality. Institutional traders use VWAP to minimize market impact. Price above VWAP is bullish; below is bearish.", category: "technical", difficulty: "intermediate", related: ["volume", "moving-average", "institutional-trading"], keyPoints: ["Benchmark for fair price", "Resets daily at market open", "Institutional execution benchmark"], formula: "VWAP = Σ(Price × Volume) / Σ(Volume)" },
  { term: "Average True Range", slug: "average-true-range", definition: "ATR is a volatility indicator that measures the average range between high and low prices over a specified period, accounting for gaps. It is used to set stop-loss levels and position sizes. ATR does not indicate direction — only the degree of price movement.", category: "technical", difficulty: "intermediate", related: ["volatility", "stop-loss-order", "position-sizing"], keyPoints: ["Measures price volatility", "Accounts for gaps", "Used for stop-loss placement"], formula: "TR = max(High-Low, |High-Prev Close|, |Low-Prev Close|); ATR = SMA(TR, 14)" },
  { term: "Ichimoku Cloud", slug: "ichimoku-cloud", definition: "A comprehensive technical indicator that defines support/resistance, identifies trend direction, gauges momentum, and provides trading signals — all in one view. The 'cloud' (Kumo) is formed between the Senkou Span A and B lines. Price above the cloud is bullish; below is bearish.", category: "technical", difficulty: "advanced", related: ["moving-average", "support-level", "resistance-level", "trend"], keyPoints: ["All-in-one indicator system", "Cloud provides support/resistance zones", "Five lines provide multiple signals"] },
  { term: "Accumulation Distribution", slug: "accumulation-distribution", definition: "A volume-based indicator that uses the relationship of closing price to the trading range, combined with volume, to assess whether a stock is being accumulated (bought) or distributed (sold). It helps identify divergences between price and buying/selling pressure.", category: "technical", difficulty: "intermediate", related: ["on-balance-volume", "volume", "money-flow"], keyPoints: ["Measures buying vs selling pressure", "Based on close position within range", "Divergences predict reversals"] },
  { term: "Earnings Per Share Growth", slug: "eps-growth", definition: "The percentage change in a company's earnings per share over a specific period, typically year-over-year or quarter-over-quarter. EPS growth is a fundamental driver of stock price appreciation and a key metric for growth investors.", category: "fundamental", difficulty: "beginner", related: ["eps", "revenue-growth", "pe-ratio"], keyPoints: ["Key growth metric", "Drives stock price long-term", "Compare to industry peers"], formula: "EPS Growth = (Current EPS - Prior EPS) / |Prior EPS| × 100" },
  { term: "Free Cash Flow", slug: "free-cash-flow", definition: "The cash a company generates after accounting for capital expenditures needed to maintain or expand its asset base. FCF represents the cash available to shareholders, debt holders, and for reinvestment. It is a better measure of profitability than earnings for many analysts.", category: "fundamental", difficulty: "intermediate", related: ["cash-flow", "capex", "valuation"], keyPoints: ["Cash available after capex", "Better than earnings for valuation", "Positive FCF = financially healthy"], formula: "FCF = Operating Cash Flow - Capital Expenditures" },
  { term: "Enterprise Value", slug: "enterprise-value", definition: "A measure of a company's total value that accounts for market cap, debt, and cash. EV represents the theoretical takeover price. EV/EBITDA is a widely used valuation multiple that allows comparison across companies with different capital structures.", category: "fundamental", difficulty: "intermediate", related: ["market-cap", "ebitda", "valuation"], keyPoints: ["Total company value metric", "Accounts for debt and cash", "EV/EBITDA for cross-company comparison"], formula: "EV = Market Cap + Total Debt - Cash" },
  { term: "Sector Rotation", slug: "sector-rotation", definition: "An investment strategy that moves money between different industry sectors based on the current phase of the economic cycle. Different sectors outperform at different stages: technology and consumer discretionary in early expansion, utilities and healthcare in late contraction.", category: "trading", difficulty: "intermediate", related: ["economic-cycle", "diversification", "asset-allocation"], keyPoints: ["Follows economic cycle phases", "Tech/Consumer early, Utilities/Health late", "Requires macro awareness"] },
  { term: "Position Sizing", slug: "position-sizing", definition: "The process of determining how many shares or contracts to trade based on account size, risk tolerance, and the specific trade setup. Proper position sizing is the most important risk management tool — even profitable strategies fail with poor position sizing.", category: "risk", difficulty: "intermediate", related: ["risk-management", "stop-loss-order", "risk-reward-ratio"], keyPoints: ["Determines trade size", "Based on account risk percentage", "1-2% risk per trade is common"], formula: "Position Size = (Account × Risk %) / (Entry - Stop Loss)" },
  { term: "Momentum", slug: "momentum", definition: "The rate of acceleration of a security's price or volume. Momentum investing involves buying securities that have shown upward trending price and selling those showing downward trends. The theory is that trends tend to persist.", category: "technical", difficulty: "beginner", related: ["rsi", "macd", "rate-of-change", "trend"], keyPoints: ["Measures trend strength", "Trends tend to persist", "Used for trend-following strategies"] },
  { term: "Relative Volume", slug: "relative-volume", definition: "A comparison of a stock's current trading volume to its average volume over a specified period. RVOL above 2.0 indicates twice the normal trading activity. High relative volume confirms the significance of price moves.", category: "technical", difficulty: "beginner", related: ["volume", "vwap", "breakout"], keyPoints: ["Current vs average volume", "RVOL > 2 = significant activity", "Confirms breakout validity"], formula: "RVOL = Current Volume / Average Volume" },
];

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return TERMS.find(t => t.slug === slug);
}

export function getTermHtml(slug: string): string | null {
  const term = getTermBySlug(slug);
  if (!term) return null;

  const cat = CATEGORIES[term.category] || { label: term.category, color: "cyan" };
  const relatedTerms = term.related
    .map(r => TERMS.find(t => t.slug === r))
    .filter(Boolean) as GlossaryTerm[];

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "EntangleWealth Financial Glossary",
      url: `${SITE_URL}/learn`,
    },
    url: `${SITE_URL}/learn/${term.slug}`,
  });

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <span class="tag tag-${cat.color}">${cat.label}</span>
      <span class="tag tag-${term.difficulty === "beginner" ? "green" : term.difficulty === "intermediate" ? "gold" : "purple"}">${term.difficulty}</span>
    </div>
    <h1>${escHtml(term.term)}</h1>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:800px;margin:0 auto;">
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">Definition</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(term.definition)}</p>
      </div>

      ${term.formula ? `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">Formula</h2>
        <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:16px;text-align:center;">
          <code class="mono" style="font-size:15px;color:#FFD700;">${escHtml(term.formula)}</code>
        </div>
      </div>` : ""}

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00e676;">Key Points</h2>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;">
          ${term.keyPoints.map(p => `<li style="display:flex;gap:10px;align-items:flex-start;color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;">
            <span style="color:#00e676;font-size:12px;margin-top:4px;">&#9679;</span>
            <span>${escHtml(p)}</span>
          </li>`).join("")}
        </ul>
      </div>

      ${term.example ? `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#a855f7;">Example</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:14px;font-style:italic;">${escHtml(term.example)}</p>
      </div>` : ""}

      ${relatedTerms.length > 0 ? `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">Related Terms</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${relatedTerms.map(r => `<a href="/learn/${r.slug}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.12);border-radius:8px;color:#00D4FF;text-decoration:none;font-size:13px;font-weight:500;transition:border-color 0.2s;">${escHtml(r.term)}</a>`).join("")}
        </div>
      </div>` : ""}

      <div style="text-align:center;margin-top:32px;">
        <a href="/learn" class="cta-btn">Explore Full Glossary</a>
      </div>
    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${term.term} — Financial Term Definition | EntangleWealth`,
    description: term.definition.slice(0, 155) + "...",
    canonical: `${SITE_URL}/learn/${term.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Learn", url: `${SITE_URL}/learn` },
      { name: term.term, url: `${SITE_URL}/learn/${term.slug}` },
    ],
  });
}

export function getGlossaryIndexHtml(): string {
  const grouped: Record<string, GlossaryTerm[]> = {};
  for (const t of TERMS) {
    (grouped[t.category] ??= []).push(t);
  }

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "EntangleWealth Financial Glossary",
    description: "Comprehensive financial glossary covering trading, options, technical analysis, fundamental analysis, and risk management terms.",
    url: `${SITE_URL}/learn`,
    hasDefinedTerm: TERMS.map(t => ({
      "@type": "DefinedTerm",
      name: t.term,
      url: `${SITE_URL}/learn/${t.slug}`,
    })),
  });

  const catOrder = ["basics", "trading", "options", "technical", "fundamental", "risk"];

  const body = `
  <div class="hero-section">
    <span class="tag tag-cyan" style="margin-bottom:16px;">Financial Education</span>
    <h1>Financial Glossary</h1>
    <p>${TERMS.length} essential trading and investing terms explained with formulas, examples, and key insights.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    ${catOrder.map(cat => {
      const terms = grouped[cat] || [];
      const info = CATEGORIES[cat] || { label: cat, color: "cyan" };
      return `
      <div style="margin-bottom:40px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span class="tag tag-${info.color}">${info.label}</span>
          <span style="color:rgba(255,255,255,0.3);font-size:12px;" class="mono">${terms.length} terms</span>
        </div>
        <div class="grid-3">
          ${terms.map(t => `
          <a href="/learn/${t.slug}" class="glass-card" style="text-decoration:none;transition:border-color 0.2s;">
            <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px;">${escHtml(t.term)}</h3>
            <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(t.definition.slice(0, 120))}...</p>
            <div style="margin-top:10px;">
              <span class="tag tag-${t.difficulty === "beginner" ? "green" : t.difficulty === "intermediate" ? "gold" : "purple"}" style="font-size:10px;">${t.difficulty}</span>
            </div>
          </a>`).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return ssrHtmlShell({
    title: `Financial Glossary — ${TERMS.length} Trading & Investing Terms | EntangleWealth`,
    description: `Master ${TERMS.length} essential financial terms. From bid-ask spreads to Ichimoku clouds — formulas, examples, and expert explanations for every level.`,
    canonical: `${SITE_URL}/learn`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Learn", url: `${SITE_URL}/learn` },
    ],
  });
}
