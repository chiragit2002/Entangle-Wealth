import { ssrHtmlShell, escHtml, SITE_URL } from "./ssrShared";

export interface IndicatorGuide {
  name: string;
  slug: string;
  category: "trend" | "momentum" | "volatility" | "volume" | "oscillator";
  summary: string;
  howItWorks: string;
  interpretation: string[];
  formula?: string;
  settings: string;
  signals: { type: "bullish" | "bearish" | "neutral"; description: string }[];
  relatedIndicators: string[];
  bestUsedWith: string[];
  timeframes: string;
}

const CAT_COLORS: Record<string, string> = {
  trend: "cyan",
  momentum: "gold",
  volatility: "red",
  volume: "green",
  oscillator: "purple",
};

export const INDICATORS: IndicatorGuide[] = [
  { name: "Relative Strength Index (RSI)", slug: "rsi", category: "momentum", summary: "Measures overbought and oversold conditions using the speed and magnitude of recent price changes.", howItWorks: "RSI compares the average gain of up periods to the average loss of down periods over a lookback window (default 14). The result oscillates between 0 and 100, with extreme readings indicating potential reversal zones.", interpretation: ["RSI above 70 suggests the asset may be overbought and due for a pullback", "RSI below 30 suggests the asset may be oversold and due for a bounce", "Divergences between RSI and price are powerful reversal signals", "RSI can remain overbought/oversold for extended periods in strong trends"], formula: "RSI = 100 - [100 / (1 + RS)], where RS = Average Gain / Average Loss over n periods", settings: "Default period: 14. Day traders may use 7-9; swing traders 14-21. Levels: 70/30 standard, 80/20 for stronger signals.", signals: [{ type: "bullish", description: "RSI crosses above 30 from oversold territory" }, { type: "bearish", description: "RSI crosses below 70 from overbought territory" }, { type: "bullish", description: "Bullish divergence: price makes lower low, RSI makes higher low" }], relatedIndicators: ["stochastic-oscillator", "macd", "cci"], bestUsedWith: ["Moving Averages for trend confirmation", "Volume for conviction assessment", "Support/Resistance levels"], timeframes: "Works on all timeframes. Most reliable on daily and 4-hour charts." },
  { name: "MACD", slug: "macd", category: "trend", summary: "Identifies trend changes and momentum shifts using the relationship between two exponential moving averages.", howItWorks: "MACD calculates the difference between a fast EMA (12) and a slow EMA (26) to create the MACD line. A signal line (9-period EMA of MACD) triggers crossover signals. The histogram shows the distance between MACD and signal lines.", interpretation: ["MACD above signal line = bullish momentum", "MACD below signal line = bearish momentum", "Histogram expanding = strengthening momentum", "Zero-line crossovers indicate trend changes"], formula: "MACD Line = EMA(12) - EMA(26); Signal Line = EMA(9) of MACD; Histogram = MACD - Signal", settings: "Standard: 12, 26, 9. Faster: 8, 17, 9. Slower: 19, 39, 9.", signals: [{ type: "bullish", description: "MACD crosses above signal line" }, { type: "bearish", description: "MACD crosses below signal line" }, { type: "bullish", description: "MACD crosses above zero line" }], relatedIndicators: ["rsi", "ema", "adx"], bestUsedWith: ["RSI for momentum confirmation", "Volume for breakout validation", "Bollinger Bands for volatility context"], timeframes: "Best on daily and weekly charts. Generates more false signals on intraday." },
  { name: "Bollinger Bands", slug: "bollinger-bands", category: "volatility", summary: "Dynamic volatility bands that expand and contract with market conditions, identifying overbought/oversold states and squeeze breakouts.", howItWorks: "Three lines are plotted: a middle band (20-period SMA) and upper/lower bands at 2 standard deviations from the middle. The bands automatically widen during high volatility and narrow during low volatility periods.", interpretation: ["Price touching upper band doesn't always mean sell — in uptrends, price 'walks the band'", "Bollinger Squeeze (narrow bands) precedes major moves", "Closing outside the bands suggests trend continuation, not reversal", "Band width measures relative volatility"], formula: "Middle Band = SMA(20); Upper = SMA(20) + 2σ; Lower = SMA(20) - 2σ", settings: "Standard: 20 period, 2 standard deviations. Some traders use 2.5 SD for fewer signals.", signals: [{ type: "bullish", description: "Price bounces off lower band with increasing volume" }, { type: "bearish", description: "Price rejected at upper band with declining volume" }, { type: "neutral", description: "Bollinger Squeeze — bands narrow, breakout imminent" }], relatedIndicators: ["keltner-channels", "average-true-range", "standard-deviation"], bestUsedWith: ["RSI for overbought/oversold confirmation", "Volume for breakout validation", "MACD for trend direction"], timeframes: "Effective on all timeframes. Daily is most popular." },
  { name: "Moving Average (SMA/EMA)", slug: "moving-average", category: "trend", summary: "Smooths price data to identify trend direction and dynamic support/resistance levels.", howItWorks: "SMA calculates the arithmetic mean of prices over n periods, weighting each price equally. EMA applies greater weight to recent prices using a multiplier of 2/(n+1), making it more responsive to new information.", interpretation: ["Price above MA = bullish; below = bearish", "Rising MA slope confirms uptrend strength", "Multiple MAs create a ribbon showing trend health", "Golden Cross (50 > 200 SMA) and Death Cross (50 < 200 SMA) are major signals"], formula: "SMA = (P₁ + P₂ + ... + Pₙ) / n; EMA = Price × k + EMA(prev) × (1-k), where k = 2/(n+1)", settings: "Common periods: 9, 20, 50, 100, 200. Short-term: 9-20 EMA. Long-term: 50-200 SMA.", signals: [{ type: "bullish", description: "Price crosses above the moving average" }, { type: "bearish", description: "Price crosses below the moving average" }, { type: "bullish", description: "Golden Cross: 50 SMA crosses above 200 SMA" }], relatedIndicators: ["macd", "ema-ribbon", "dema"], bestUsedWith: ["Volume for crossover confirmation", "RSI for momentum context", "ATR for volatility-adjusted stops"], timeframes: "Daily for position trading, 4H for swing trading, 15-min for day trading." },
  { name: "Average True Range (ATR)", slug: "average-true-range", category: "volatility", summary: "Measures market volatility by decomposing the entire range of an asset price for a period, accounting for gaps.", howItWorks: "ATR calculates the True Range — the greatest of: current high minus low, absolute value of current high minus previous close, or absolute value of current low minus previous close. It then smooths this over n periods.", interpretation: ["Rising ATR = increasing volatility", "Falling ATR = decreasing volatility", "ATR does NOT indicate direction", "Use ATR multiples for stop-loss placement (e.g., 2× ATR)"], formula: "TR = max(High-Low, |High-PrevClose|, |Low-PrevClose|); ATR = SMA(TR, 14)", settings: "Default: 14 periods. Day traders often use 10. Stop placement: 1.5-3× ATR from entry.", signals: [{ type: "neutral", description: "ATR expanding — volatility increasing, prepare for larger moves" }, { type: "neutral", description: "ATR contracting — consolidation, breakout likely forming" }], relatedIndicators: ["bollinger-bands", "keltner-channels", "volatility"], bestUsedWith: ["Trend indicators for direction", "Price action for entry timing", "Position sizing calculations"], timeframes: "All timeframes. Daily ATR most commonly referenced." },
  { name: "Stochastic Oscillator", slug: "stochastic-oscillator", category: "oscillator", summary: "Compares closing price to the price range over a period, identifying overbought and oversold levels.", howItWorks: "The %K line measures where the current close sits within the recent high-low range. The %D line is a 3-period SMA of %K, acting as a signal line. Values range from 0 to 100.", interpretation: ["Above 80 = overbought territory", "Below 20 = oversold territory", "%K crossing above %D = buy signal", "%K crossing below %D = sell signal"], formula: "%K = (Close - Low₁₄) / (High₁₄ - Low₁₄) × 100; %D = SMA(%K, 3)", settings: "Standard: (14, 3, 3). Fast stochastic uses raw %K. Slow stochastic smooths %K with additional SMA.", signals: [{ type: "bullish", description: "%K crosses above %D below 20 (oversold)" }, { type: "bearish", description: "%K crosses below %D above 80 (overbought)" }, { type: "bullish", description: "Bullish divergence in oversold zone" }], relatedIndicators: ["rsi", "williams-r", "cci"], bestUsedWith: ["Moving Averages for trend filter", "Support/Resistance levels", "Volume for confirmation"], timeframes: "Best on 4-hour and daily charts for swing trading." },
  { name: "On-Balance Volume (OBV)", slug: "on-balance-volume", category: "volume", summary: "A cumulative volume indicator that relates volume flow to price changes, confirming trends and spotting divergences.", howItWorks: "OBV adds the day's volume when the close is higher than the previous close and subtracts it when the close is lower. The absolute value of OBV is less important than its direction and trend.", interpretation: ["Rising OBV confirms uptrend", "Falling OBV confirms downtrend", "OBV divergence from price signals potential reversal", "OBV breakout often precedes price breakout"], formula: "If Close > Prev Close: OBV = Prev OBV + Volume; If Close < Prev Close: OBV = Prev OBV - Volume", settings: "No adjustable parameters. Apply to daily or weekly charts.", signals: [{ type: "bullish", description: "OBV making new highs while price consolidates" }, { type: "bearish", description: "OBV declining while price holds steady" }], relatedIndicators: ["accumulation-distribution", "money-flow-index", "vwap"], bestUsedWith: ["Price breakout patterns", "Moving averages on OBV itself", "RSI for momentum context"], timeframes: "Daily and weekly for reliable signals." },
  { name: "VWAP", slug: "vwap", category: "volume", summary: "The volume-weighted average price serves as an intraday benchmark for institutional execution quality and dynamic support/resistance.", howItWorks: "VWAP calculates the average price weighted by volume from the start of the trading session. It resets at each session open. Large institutional orders benchmark against VWAP to measure execution quality.", interpretation: ["Price above VWAP = bullish intraday bias", "Price below VWAP = bearish intraday bias", "VWAP acts as intraday dynamic support/resistance", "Distance from VWAP indicates extended moves"], formula: "VWAP = Σ(Typical Price × Volume) / Σ(Volume), where Typical Price = (H + L + C) / 3", settings: "No adjustable parameters. Anchored VWAP starts from a chosen date rather than session open.", signals: [{ type: "bullish", description: "Price reclaims VWAP from below with strong volume" }, { type: "bearish", description: "Price breaks below VWAP with strong volume" }], relatedIndicators: ["moving-average", "volume-profile", "twap"], bestUsedWith: ["Relative volume for conviction", "Price action at VWAP for entries", "ATR for profit targets"], timeframes: "Primarily intraday (1-min to 60-min). Anchored VWAP for multi-day analysis." },
  { name: "Fibonacci Retracement", slug: "fibonacci-retracement", category: "trend", summary: "Identifies potential support and resistance levels based on key Fibonacci ratios applied to a price swing.", howItWorks: "After identifying a significant price move (swing high to swing low or vice versa), horizontal lines are drawn at the key Fibonacci levels: 23.6%, 38.2%, 50%, 61.8%, and 78.6%. These levels represent potential areas where price may reverse.", interpretation: ["38.2% retracement = shallow pullback in strong trend", "50% retracement = moderate pullback", "61.8% retracement = deep pullback, last defense", "Multiple Fibonacci levels from different swings create confluence zones"], settings: "Standard levels: 23.6%, 38.2%, 50%, 61.8%, 78.6%. Some traders add 88.6% and extensions at 127.2%, 161.8%.", signals: [{ type: "bullish", description: "Price bounces off 61.8% retracement with bullish candle pattern" }, { type: "neutral", description: "Confluence zone where multiple Fib levels align with horizontal support" }], relatedIndicators: ["fibonacci-extensions", "moving-average", "pivot-points"], bestUsedWith: ["Candlestick patterns at Fib levels", "Volume for bounce confirmation", "RSI divergence at key levels"], timeframes: "All timeframes. Daily and 4-hour most reliable." },
  { name: "Ichimoku Cloud", slug: "ichimoku-cloud", category: "trend", summary: "A comprehensive indicator system that identifies trend direction, momentum, and support/resistance in a single view.", howItWorks: "Five lines create the system: Tenkan-sen (conversion, 9-period), Kijun-sen (base, 26-period), Senkou Span A and B form the 'cloud' projected 26 periods forward, and Chikou Span is the close plotted 26 periods back.", interpretation: ["Price above cloud = bullish; below = bearish; inside = consolidation", "Thick cloud = strong support/resistance; thin cloud = weak", "Cloud color change (bullish/bearish crossover) signals trend shift", "Chikou Span above price confirms bullish setup"], settings: "Traditional: 9, 26, 52. Some traders use 10, 30, 60 for crypto markets.", signals: [{ type: "bullish", description: "TK cross above cloud with Chikou Span above price" }, { type: "bearish", description: "TK cross below cloud with Chikou Span below price" }, { type: "neutral", description: "Price inside cloud — no clear trend, wait" }], relatedIndicators: ["moving-average", "macd", "parabolic-sar"], bestUsedWith: ["Volume for breakout confirmation", "RSI for momentum extremes", "Candlestick patterns at cloud edge"], timeframes: "Daily and weekly for position trading. 4-hour for swing trading." },
  { name: "ADX (Average Directional Index)", slug: "adx", category: "trend", summary: "Measures trend strength regardless of direction, helping traders distinguish between trending and ranging markets.", howItWorks: "ADX is derived from two directional indicators: +DI (positive directional indicator) and -DI (negative directional indicator). ADX itself measures the strength of the trend without indicating direction. Values range from 0 to 100.", interpretation: ["ADX above 25 = trending market", "ADX below 20 = ranging/choppy market", "+DI above -DI = bullish trend", "-DI above +DI = bearish trend"], formula: "ADX = Smoothed average of |+DI - -DI| / (+DI + -DI) × 100", settings: "Default: 14 periods. Some traders use 20 for smoother readings.", signals: [{ type: "bullish", description: "+DI crosses above -DI with ADX > 25" }, { type: "bearish", description: "-DI crosses above +DI with ADX > 25" }, { type: "neutral", description: "ADX below 20 — avoid trend-following strategies" }], relatedIndicators: ["macd", "moving-average", "parabolic-sar"], bestUsedWith: ["RSI/Stochastic in ranging markets (low ADX)", "Moving average crossovers in trending markets (high ADX)", "ATR for volatility context"], timeframes: "Daily for swing/position trading. 4-hour for active trading." },
  { name: "Commodity Channel Index (CCI)", slug: "cci", category: "oscillator", summary: "Measures the current price level relative to an average price level over a given period, identifying cyclical trends.", howItWorks: "CCI measures the deviation of the typical price from its SMA, scaled by a constant to ensure ~75% of values fall between -100 and +100. Readings beyond these thresholds signal overbought/oversold conditions or emerging trends.", interpretation: ["CCI above +100 = strong uptrend or overbought", "CCI below -100 = strong downtrend or oversold", "Zero-line crossovers indicate trend direction change", "Divergences between CCI and price signal potential reversals"], formula: "CCI = (Typical Price - SMA) / (0.015 × Mean Deviation)", settings: "Default: 20 periods. Shorter periods (14) for more signals; longer (30) for fewer but more reliable.", signals: [{ type: "bullish", description: "CCI crosses above -100 from below" }, { type: "bearish", description: "CCI crosses below +100 from above" }], relatedIndicators: ["rsi", "stochastic-oscillator", "williams-r"], bestUsedWith: ["Moving averages for trend context", "Volume for conviction", "Support/resistance levels"], timeframes: "Daily and 4-hour for swing trading." },
  { name: "Parabolic SAR", slug: "parabolic-sar", category: "trend", summary: "A trend-following indicator that provides potential entry and exit points by placing dots above or below price.", howItWorks: "SAR (Stop and Reverse) places dots that trail behind price. When price is rising, dots appear below candles; when falling, dots appear above. A reversal occurs when price crosses the SAR dots.", interpretation: ["Dots below price = uptrend (long signal)", "Dots above price = downtrend (short signal)", "Dot flip = potential trend reversal", "Best in trending markets; generates whipsaws in ranges"], formula: "SAR = Prior SAR + AF × (EP - Prior SAR), where AF starts at 0.02, max 0.20", settings: "Step: 0.02, Maximum: 0.20. Lower step = smoother, slower signals.", signals: [{ type: "bullish", description: "Dots flip from above to below price" }, { type: "bearish", description: "Dots flip from below to above price" }], relatedIndicators: ["adx", "moving-average", "trailing-stop"], bestUsedWith: ["ADX to confirm trending market", "Volume for reversal confirmation", "Moving averages for trend direction"], timeframes: "Daily for swing trading. Avoid in choppy markets." },
  { name: "Williams %R", slug: "williams-r", category: "oscillator", summary: "A momentum indicator that measures overbought and oversold levels, similar to the Stochastic oscillator but inverted.", howItWorks: "Williams %R compares the current close to the highest high over a lookback period. Values range from 0 to -100, with -20 to 0 considered overbought and -80 to -100 considered oversold.", interpretation: ["%R above -20 = overbought", "%R below -80 = oversold", "Faster than RSI, more suited to short-term trading", "Divergences signal potential reversals"], formula: "%R = (Highest High - Close) / (Highest High - Lowest Low) × -100", settings: "Default: 14 periods. Use 10 for faster signals or 20 for smoother.", signals: [{ type: "bullish", description: "%R crosses above -80 from oversold" }, { type: "bearish", description: "%R crosses below -20 from overbought" }], relatedIndicators: ["stochastic-oscillator", "rsi", "cci"], bestUsedWith: ["Trend indicators to avoid counter-trend trades", "Volume for confirmation", "Support/resistance levels"], timeframes: "Intraday to daily for active traders." },
  { name: "Money Flow Index (MFI)", slug: "money-flow-index", category: "volume", summary: "A volume-weighted RSI that incorporates both price and volume data to measure buying and selling pressure.", howItWorks: "MFI uses typical price and volume to calculate money flow. Positive money flow occurs when the typical price is higher than the previous period; negative when it's lower. The ratio creates an oscillator between 0 and 100.", interpretation: ["MFI above 80 = overbought (potential selling pressure)", "MFI below 20 = oversold (potential buying pressure)", "More reliable than RSI because it includes volume", "Divergences with price are high-probability signals"], formula: "MFI = 100 - [100 / (1 + Money Ratio)], where Money Ratio = Positive MF / Negative MF", settings: "Default: 14 periods. Same as RSI but volume-weighted.", signals: [{ type: "bullish", description: "MFI crosses above 20 from oversold with rising volume" }, { type: "bearish", description: "MFI crosses below 80 from overbought" }], relatedIndicators: ["rsi", "on-balance-volume", "accumulation-distribution"], bestUsedWith: ["Price action patterns", "Support/resistance levels", "Trend indicators"], timeframes: "Daily and weekly for reliable signals." },
];

export function getIndicatorBySlug(slug: string): IndicatorGuide | undefined {
  return INDICATORS.find(i => i.slug === slug);
}

export function getIndicatorHtml(slug: string): string | null {
  const ind = getIndicatorBySlug(slug);
  if (!ind) return null;

  const catColor = CAT_COLORS[ind.category] || "cyan";

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Use ${ind.name}`,
    description: ind.summary,
    url: `${SITE_URL}/indicators/${ind.slug}`,
    step: [
      { "@type": "HowToStep", position: 1, name: "Understand the Indicator", text: ind.howItWorks },
      { "@type": "HowToStep", position: 2, name: "Configure Settings", text: ind.settings },
      { "@type": "HowToStep", position: 3, name: "Read the Signals", text: ind.interpretation.join(". ") },
    ],
  });

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <span class="tag tag-${catColor}">${ind.category}</span>
    </div>
    <h1>How to Use ${escHtml(ind.name)}</h1>
    <p>${escHtml(ind.summary)}</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:800px;margin:0 auto;">

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">How It Works</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(ind.howItWorks)}</p>
      </div>

      ${ind.formula ? `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">Formula</h2>
        <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:16px;">
          <code class="mono" style="font-size:14px;color:#FFD700;word-break:break-word;">${escHtml(ind.formula)}</code>
        </div>
      </div>` : ""}

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00e676;">Interpretation</h2>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;">
          ${ind.interpretation.map(p => `<li style="display:flex;gap:10px;align-items:flex-start;color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;">
            <span style="color:#00e676;font-size:12px;margin-top:4px;">&#9679;</span>
            <span>${escHtml(p)}</span>
          </li>`).join("")}
        </ul>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">Trading Signals</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${ind.signals.map(s => `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px;background:rgba(${s.type === "bullish" ? "0,230,118" : s.type === "bearish" ? "255,51,102" : "168,85,247"},0.05);border:1px solid rgba(${s.type === "bullish" ? "0,230,118" : s.type === "bearish" ? "255,51,102" : "168,85,247"},0.12);border-radius:10px;">
            <span class="tag tag-${s.type === "bullish" ? "green" : s.type === "bearish" ? "red" : "purple"}">${s.type}</span>
            <span style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.5;">${escHtml(s.description)}</span>
          </div>`).join("")}
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">Settings & Configuration</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:14px;">${escHtml(ind.settings)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">Best Used With</h2>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;">
          ${ind.bestUsedWith.map(b => `<li style="color:rgba(255,255,255,0.7);font-size:14px;display:flex;gap:8px;align-items:center;">
            <span style="color:#00D4FF;">&#8594;</span> ${escHtml(b)}
          </li>`).join("")}
        </ul>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">Recommended Timeframes</h2>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;">${escHtml(ind.timeframes)}</p>
      </div>

      ${ind.relatedIndicators.length > 0 ? `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">Related Indicators</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${ind.relatedIndicators.map(r => {
            const related = INDICATORS.find(i => i.slug === r);
            return related
              ? `<a href="/indicators/${r}" style="display:inline-flex;align-items:center;padding:8px 14px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.12);border-radius:8px;color:#00D4FF;text-decoration:none;font-size:13px;font-weight:500;">${escHtml(related.name)}</a>`
              : `<span style="padding:8px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:rgba(255,255,255,0.4);font-size:13px;">${escHtml(r)}</span>`;
          }).join("")}
        </div>
      </div>` : ""}

      <div style="text-align:center;margin-top:32px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <a href="/indicators" class="cta-btn">All Indicators</a>
        <a href="${SITE_URL}/technical" class="cta-btn" style="background:rgba(255,255,255,0.05);color:#00D4FF;border:1px solid rgba(0,212,255,0.2);">Try Live Analysis</a>
      </div>
    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${ind.name} — How to Use, Formula & Signals | EntangleWealth`,
    description: `${ind.summary} Learn the formula, settings, and trading signals for ${ind.name}.`,
    canonical: `${SITE_URL}/indicators/${ind.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Indicators", url: `${SITE_URL}/indicators` },
      { name: ind.name, url: `${SITE_URL}/indicators/${ind.slug}` },
    ],
  });
}

export function getIndicatorIndexHtml(): string {
  const grouped: Record<string, IndicatorGuide[]> = {};
  for (const ind of INDICATORS) {
    (grouped[ind.category] ??= []).push(ind);
  }

  const catOrder = ["trend", "momentum", "volatility", "volume", "oscillator"];
  const catLabels: Record<string, string> = {
    trend: "Trend Following",
    momentum: "Momentum",
    volatility: "Volatility",
    volume: "Volume-Based",
    oscillator: "Oscillators",
  };

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Technical Indicators Guide",
    description: `${INDICATORS.length} technical indicators explained with formulas, interpretation, and trading signals.`,
    url: `${SITE_URL}/indicators`,
    numberOfItems: INDICATORS.length,
    itemListElement: INDICATORS.map((ind, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: ind.name,
      url: `${SITE_URL}/indicators/${ind.slug}`,
    })),
  });

  const body = `
  <div class="hero-section">
    <span class="tag tag-gold" style="margin-bottom:16px;">Technical Analysis</span>
    <h1>Technical Indicators Guide</h1>
    <p>${INDICATORS.length} indicators with formulas, settings, and real trading signals. From beginner RSI to advanced Ichimoku.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    ${catOrder.map(cat => {
      const indicators = grouped[cat] || [];
      const color = CAT_COLORS[cat] || "cyan";
      return `
      <div style="margin-bottom:40px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span class="tag tag-${color}">${catLabels[cat] || cat}</span>
          <span style="color:rgba(255,255,255,0.3);font-size:12px;" class="mono">${indicators.length} indicators</span>
        </div>
        <div class="grid-2">
          ${indicators.map(ind => `
          <a href="/indicators/${ind.slug}" class="glass-card" style="text-decoration:none;transition:border-color 0.2s;">
            <h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px;">${escHtml(ind.name)}</h3>
            <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;margin-bottom:10px;">${escHtml(ind.summary)}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${ind.signals.slice(0, 2).map(s => `<span class="tag tag-${s.type === "bullish" ? "green" : s.type === "bearish" ? "red" : "purple"}" style="font-size:9px;">${s.type}</span>`).join("")}
            </div>
          </a>`).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return ssrHtmlShell({
    title: `Technical Indicators Guide — ${INDICATORS.length} Trading Indicators | EntangleWealth`,
    description: `Master ${INDICATORS.length} technical indicators: RSI, MACD, Bollinger Bands, Ichimoku, and more. Formulas, settings, and trading signals for every level.`,
    canonical: `${SITE_URL}/indicators`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Indicators", url: `${SITE_URL}/indicators` },
    ],
  });
}
