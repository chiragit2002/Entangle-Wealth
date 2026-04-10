import { ssrHtmlShell, escHtml, SITE_URL } from "./ssrShared";

export interface ChartPattern {
  name: string;
  slug: string;
  category: "reversal" | "continuation" | "candlestick" | "harmonic";
  direction: "bullish" | "bearish" | "both";
  reliability: "high" | "medium" | "low";
  description: string;
  formation: string;
  psychology: string;
  confirmationSignals: string[];
  targetCalculation: string;
  commonMistakes: string[];
  bestTimeframes: string;
  relatedPatterns: string[];
}

const CAT_META: Record<string, { label: string; color: string }> = {
  reversal: { label: "Reversal", color: "red" },
  continuation: { label: "Continuation", color: "green" },
  candlestick: { label: "Candlestick", color: "gold" },
  harmonic: { label: "Harmonic", color: "purple" },
};

const DIR_COLORS: Record<string, string> = { bullish: "green", bearish: "red", both: "cyan" };
const REL_COLORS: Record<string, string> = { high: "green", medium: "gold", low: "red" };

export const PATTERNS: ChartPattern[] = [
  {
    name: "Head and Shoulders",
    slug: "head-and-shoulders",
    category: "reversal",
    direction: "bearish",
    reliability: "high",
    description: "One of the most reliable reversal patterns, signaling the end of an uptrend. Consists of three peaks — a higher middle peak (head) flanked by two lower peaks (shoulders) with a common neckline.",
    formation: "Left shoulder forms as price makes a high and pulls back. The head forms as price rallies to a higher high and pulls back again, roughly to the same level as the left shoulder pullback. The right shoulder forms as price rallies but fails to reach the head's height, pulling back toward the neckline. The pattern completes when price breaks below the neckline.",
    psychology: "The left shoulder represents strong buying. The head shows buyers pushing higher but with weakening momentum. The right shoulder confirms buyers cannot regain control — lower high = fading demand. The neckline break triggers stop-losses and short-selling, accelerating the decline.",
    confirmationSignals: ["Volume decreases from left shoulder → head → right shoulder", "Neckline break occurs on above-average volume", "Price fails to reclaim the neckline after the break", "RSI shows bearish divergence (lower highs while price makes head)"],
    targetCalculation: "Measured move: distance from the head to the neckline, projected downward from the neckline break point. Example: Head at $100, neckline at $90, target = $90 - $10 = $80.",
    commonMistakes: ["Entering before neckline confirmation", "Ignoring volume pattern", "Confusing with a pullback in an uptrend", "Not adjusting for sloped necklines"],
    bestTimeframes: "Most reliable on daily and weekly charts. 4-hour for swing trades. Patterns that take 1-6 months to form are most significant.",
    relatedPatterns: ["inverse-head-and-shoulders", "double-top", "triple-top"],
  },
  {
    name: "Inverse Head and Shoulders",
    slug: "inverse-head-and-shoulders",
    category: "reversal",
    direction: "bullish",
    reliability: "high",
    description: "The bullish mirror of the Head and Shoulders, signaling the end of a downtrend. Three troughs — a lower middle trough (head) flanked by two higher troughs (shoulders) — form at the bottom of a decline.",
    formation: "Left shoulder forms as price makes a low and bounces. The head forms as price drops to a lower low and bounces again to the neckline area. The right shoulder forms as price drops but holds above the head's low, bouncing toward the neckline. Breakout above the neckline completes the pattern.",
    psychology: "The left shoulder represents heavy selling. The head shows maximum pessimism — sellers exhaust themselves. The right shoulder shows sellers cannot push to new lows — higher low = weakening supply. The neckline break triggers short covering and new buying.",
    confirmationSignals: ["Volume should increase on the right shoulder and especially on the neckline break", "RSI shows bullish divergence (higher lows while price makes head)", "Price holds above neckline after breakout (retest)", "Momentum indicators turn bullish"],
    targetCalculation: "Distance from the head to the neckline, projected upward from the breakout. Example: Head at $50, neckline at $60, target = $60 + $10 = $70.",
    commonMistakes: ["Buying before neckline breakout confirmation", "Expecting the pattern in a strong downtrend without slowing momentum", "Ignoring volume confirmation on the breakout", "Setting stops too tight below the right shoulder"],
    bestTimeframes: "Daily and weekly for highest reliability. 4-hour for active trading. Larger patterns (3-6 months) produce more powerful moves.",
    relatedPatterns: ["head-and-shoulders", "double-bottom", "triple-bottom"],
  },
  {
    name: "Double Top",
    slug: "double-top",
    category: "reversal",
    direction: "bearish",
    reliability: "high",
    description: "A bearish reversal pattern where price tests the same resistance level twice and fails, creating an 'M' shape on the chart. The failure to break higher signals exhausted buying pressure.",
    formation: "Price rallies to resistance (first top), pulls back to support (the neckline), rallies again to approximately the same level (second top), then fails and breaks below the neckline support. The two tops don't need to be exactly equal — within 3% is acceptable.",
    psychology: "The first top establishes resistance where sellers are willing to sell. The pullback shows buyers pausing. The second rally shows buyers trying again but failing at the same level — this double failure indicates strong supply. The neckline break confirms the reversal.",
    confirmationSignals: ["Volume typically lower on the second top than the first", "Neckline (support) breaks on increased volume", "RSI divergence — lower RSI at second top despite similar price", "Failure candle at the second top (doji, shooting star)"],
    targetCalculation: "Height from tops to neckline, projected down from the neckline break. Example: Tops at $50, neckline at $45, target = $45 - $5 = $40.",
    commonMistakes: ["Calling a double top before the neckline breaks", "Confusing a consolidation pause with a double top", "Not waiting for confirmation volume", "Setting targets beyond the measured move without reason"],
    bestTimeframes: "Daily and weekly charts. Intraday double tops are less reliable. Pattern should develop over at least 2-4 weeks.",
    relatedPatterns: ["double-bottom", "head-and-shoulders", "triple-top"],
  },
  {
    name: "Double Bottom",
    slug: "double-bottom",
    category: "reversal",
    direction: "bullish",
    reliability: "high",
    description: "A bullish reversal pattern where price tests the same support level twice and bounces, creating a 'W' shape. The failure to break lower signals exhausted selling pressure and a potential uptrend.",
    formation: "Price falls to support (first bottom), bounces to resistance (the neckline), falls again to approximately the same level (second bottom), then rallies and breaks above the neckline resistance. The second bottom often has higher volume than the first, showing accumulation.",
    psychology: "The first bottom establishes support where buyers emerge. The bounce shows recovery but at resistance, profit-taking occurs. The retest shows sellers trying again but failing — this double defense indicates strong demand. The neckline break confirms the reversal.",
    confirmationSignals: ["Volume often increases on the second bottom (accumulation)", "Neckline breakout occurs on strong volume", "RSI bullish divergence — higher RSI at second bottom", "Bullish candlestick at the second bottom (hammer, bullish engulfing)"],
    targetCalculation: "Height from neckline to bottoms, projected upward from the neckline breakout. Example: Bottoms at $30, neckline at $35, target = $35 + $5 = $40.",
    commonMistakes: ["Buying at the second bottom before neckline confirmation", "Confusing a bounce in a downtrend with a double bottom", "Ignoring the overall trend context", "Expecting exact price levels (allow 3% variance)"],
    bestTimeframes: "Daily and weekly for strongest signals. 4-hour for active swing trading. Minimum 2-4 weeks of formation.",
    relatedPatterns: ["double-top", "inverse-head-and-shoulders", "triple-bottom"],
  },
  {
    name: "Ascending Triangle",
    slug: "ascending-triangle",
    category: "continuation",
    direction: "bullish",
    reliability: "high",
    description: "A bullish continuation pattern with a flat upper resistance line and a rising lower trendline. Each pullback makes a higher low while testing the same resistance, building pressure for an upside breakout.",
    formation: "Price tests a horizontal resistance level multiple times while making progressively higher lows on pullbacks. The rising lower trendline and flat upper line create a triangle that converges. The breakout typically occurs in the final third of the triangle, before the lines converge.",
    psychology: "Buyers are increasingly aggressive — each pullback is smaller, showing growing demand. Sellers defend the resistance level but their selling pressure is gradually overwhelmed. When the last seller is absorbed, the breakout occurs on accumulated buying pressure.",
    confirmationSignals: ["Breakout above resistance on 2×+ average volume", "At least 2-3 touches of both the flat resistance and rising support", "Price holds above resistance after breakout (retest)", "Pattern forms after an uptrend (continuation context)"],
    targetCalculation: "Height of the triangle (resistance minus the first low) projected upward from the breakout. Example: Resistance at $50, first low at $42, target = $50 + $8 = $58.",
    commonMistakes: ["Trading before breakout confirmation", "Entering when the triangle has already converged (late entry)", "Ignoring the preceding trend direction", "Not confirming with volume on the breakout"],
    bestTimeframes: "Daily for swing/position trades. 1-hour and 4-hour for active trading. Pattern should have at least 4 touches of the boundary lines.",
    relatedPatterns: ["descending-triangle", "symmetrical-triangle", "bull-flag"],
  },
  {
    name: "Descending Triangle",
    slug: "descending-triangle",
    category: "continuation",
    direction: "bearish",
    reliability: "high",
    description: "A bearish continuation pattern with a flat lower support line and a declining upper trendline. Each rally makes a lower high while testing the same support, building pressure for a downside breakout.",
    formation: "Price tests a horizontal support level multiple times while making progressively lower highs on rallies. The declining upper trendline and flat lower line create a downward-converging triangle. The breakdown typically occurs before the lines fully converge.",
    psychology: "Sellers are increasingly aggressive — each rally is weaker, showing growing supply pressure. Buyers defend the support level but their buying power fades with each test. When support is finally overwhelmed, stops trigger and the decline accelerates.",
    confirmationSignals: ["Breakdown below support on above-average volume", "At least 2-3 touches of both flat support and declining resistance", "Price stays below support after the break (no reclaim)", "Pattern forms within a downtrend context"],
    targetCalculation: "Height of the triangle projected downward from the breakdown. Example: First high at $60, support at $50, target = $50 - $10 = $40.",
    commonMistakes: ["Shorting before breakdown confirmation", "Confusing with a base formation in a bottoming process", "Not confirming with volume", "Expecting the breakdown too early in the triangle"],
    bestTimeframes: "Daily and 4-hour for swing trades. Weekly for position trades. Minimum 3 weeks of formation for reliability.",
    relatedPatterns: ["ascending-triangle", "symmetrical-triangle", "bear-flag"],
  },
  {
    name: "Symmetrical Triangle",
    slug: "symmetrical-triangle",
    category: "continuation",
    direction: "both",
    reliability: "medium",
    description: "A neutral continuation pattern with converging trendlines (lower highs and higher lows) that indicates a period of consolidation before the next directional move. The breakout direction typically follows the preceding trend.",
    formation: "Price oscillates between a declining upper trendline and a rising lower trendline, with each swing smaller than the last. The pattern resembles a coil or spring. Breakout occurs in the final third of the triangle, favoring the direction of the preceding trend.",
    psychology: "Neither buyers nor sellers can gain control — the market is in equilibrium. Volatility contracts as both sides wait for a catalyst. When the equilibrium breaks, the pent-up energy drives a sharp move. The preceding trend usually wins because the dominant force is temporarily resting, not reversing.",
    confirmationSignals: ["Breakout on significantly above-average volume", "Breakout in the direction of the prior trend", "Price doesn't re-enter the triangle after breaking out", "Momentum indicators confirm the breakout direction"],
    targetCalculation: "Height of the triangle at its widest point, projected from the breakout. Example: Triangle height is $8, breakout at $45 upward, target = $53.",
    commonMistakes: ["Guessing the breakout direction", "Trading inside the triangle (whipsaws)", "Entering on the first touch of a trendline without a breakout", "Ignoring the preceding trend direction"],
    bestTimeframes: "Daily for the most reliable signals. 4-hour for active traders. Pattern should take at least 3-4 weeks to form.",
    relatedPatterns: ["ascending-triangle", "descending-triangle", "pennant"],
  },
  {
    name: "Bull Flag",
    slug: "bull-flag",
    category: "continuation",
    direction: "bullish",
    reliability: "high",
    description: "A bullish continuation pattern consisting of a sharp rally (the flagpole) followed by a slight downward-sloping consolidation (the flag). The breakout from the flag continues the prior uptrend.",
    formation: "A strong, high-volume rally creates the flagpole. Then price consolidates in a slight downward channel or rectangle (the flag) on declining volume. The flag typically retraces 38-50% of the flagpole. Breakout occurs when price breaks above the upper flag boundary on increasing volume.",
    psychology: "The flagpole represents aggressive buying. The flag is a period of profit-taking and digestion — buyers rest but sellers can't push price down significantly. When the consolidation ends, fresh buyers enter and the trend resumes with renewed vigor.",
    confirmationSignals: ["Volume decreases during flag formation", "Volume surges on the breakout above the flag", "Flag retraces less than 50% of the flagpole", "RSI resets during the flag without reaching oversold"],
    targetCalculation: "Length of the flagpole added to the breakout point. Example: Flagpole from $40 to $50 ($10), flag down to $47, target = $47 + $10 = $57.",
    commonMistakes: ["Confusing a deep retracement (>50%) with a flag", "Entering during the flag before breakout confirmation", "Ignoring volume — a flag needs declining volume", "Setting the target too aggressively"],
    bestTimeframes: "Works on all timeframes. Daily and 4-hour for swing trades. 15-minute and 1-hour for day trades. Flag should last 1-4 weeks on daily chart.",
    relatedPatterns: ["bear-flag", "pennant", "ascending-triangle"],
  },
  {
    name: "Bear Flag",
    slug: "bear-flag",
    category: "continuation",
    direction: "bearish",
    reliability: "high",
    description: "A bearish continuation pattern consisting of a sharp decline (the flagpole) followed by a slight upward-sloping consolidation (the flag). The breakdown from the flag continues the prior downtrend.",
    formation: "A strong, high-volume decline creates the flagpole. Price then consolidates in a slight upward channel or rectangle (the flag) on declining volume. The flag typically retraces 38-50% of the flagpole. The pattern completes when price breaks below the lower flag boundary.",
    psychology: "The flagpole represents aggressive selling. The flag is a period of short-covering and weak buying — the bounce is unconvincing. When the brief relief rally fails, sellers re-engage and the downtrend resumes.",
    confirmationSignals: ["Volume decreases during flag formation", "Breakdown on increased volume", "Flag retraces less than 50% of the flagpole", "RSI doesn't reach overbought during the flag"],
    targetCalculation: "Length of the flagpole subtracted from the breakdown point. Example: Flagpole from $60 to $50 ($10), flag up to $53, target = $53 - $10 = $43.",
    commonMistakes: ["Confusing a reversal with a bear flag", "Entering short too early (during the flag)", "Ignoring the volume pattern", "Not recognizing the preceding downtrend"],
    bestTimeframes: "Daily for swing trades. 4-hour for active trading. The flag typically lasts 1-3 weeks on a daily chart.",
    relatedPatterns: ["bull-flag", "pennant", "descending-triangle"],
  },
  {
    name: "Cup and Handle",
    slug: "cup-and-handle",
    category: "continuation",
    direction: "bullish",
    reliability: "high",
    description: "A bullish continuation pattern that resembles a teacup with a handle. The rounded cup bottom shows gradual accumulation, followed by a small pullback (handle) before the breakout to new highs.",
    formation: "The cup forms as price declines, rounds off, and recovers to the prior high (creating a U-shape, not V-shape). The handle forms as a small pullback (typically 10-15% of the cup depth) in a downward-sloping channel. The breakout occurs when price moves above the cup's rim (prior high).",
    psychology: "The cup's left side represents selling. The bottom is accumulation — smart money buying gradually. The right side shows recovery. The handle is a final shakeout of weak holders before the breakout. It's a classic accumulation-to-breakout cycle.",
    confirmationSignals: ["Cup has a U-shape (not V — gradual is better)", "Handle retraces 10-33% of the cup depth", "Volume is highest at the beginning and end of the cup", "Breakout above the rim on strong volume", "Handle doesn't drop below the cup's midpoint"],
    targetCalculation: "Depth of the cup projected upward from the breakout (rim). Example: Rim at $50, cup bottom at $40 (depth = $10), target = $50 + $10 = $60.",
    commonMistakes: ["Confusing V-bottoms with cups (rounded bottom is key)", "Entering during handle formation before breakout", "Handle too deep (>50% of cup = pattern may be failing)", "Ignoring volume confirmation on the breakout"],
    bestTimeframes: "Best on weekly and daily charts for major moves. The cup should take 1-6 months to form. Handle typically 1-4 weeks. Larger cups produce larger measured moves.",
    relatedPatterns: ["ascending-triangle", "bull-flag", "inverse-head-and-shoulders"],
  },
  {
    name: "Pennant",
    slug: "pennant",
    category: "continuation",
    direction: "both",
    reliability: "medium",
    description: "A short-term continuation pattern that forms after a sharp move (the pole), followed by a small symmetrical triangle consolidation (the pennant). The breakout continues in the direction of the pole.",
    formation: "A sharp, high-volume move creates the pole. Price then consolidates in a small symmetrical triangle (converging trendlines) lasting 1-3 weeks. Volume contracts during the pennant. The breakout resumes the prior trend direction on expanding volume.",
    psychology: "The pole represents a strong impulse (buying or selling surge). The pennant is a brief pause as the market absorbs the move. Unlike a symmetrical triangle, a pennant forms quickly and breaks in the pole's direction as the dominant force resumes.",
    confirmationSignals: ["Pennant forms quickly (1-3 weeks, not months)", "Volume contracts during the pennant", "Breakout occurs in the direction of the pole", "Volume expands on the breakout"],
    targetCalculation: "Length of the pole added to the breakout point. Example: Pole from $30 to $40, pennant narrows around $38, target = $38 + $10 = $48.",
    commonMistakes: ["Confusing with a symmetrical triangle (pennant is shorter duration)", "Trading against the pole direction", "Entering before the breakout confirmation", "Not measuring the pole correctly for the target"],
    bestTimeframes: "Daily and 4-hour for swing trades. Intraday pennants are common in momentum stocks. The pennant should last 1-3 weeks maximum on a daily chart.",
    relatedPatterns: ["bull-flag", "bear-flag", "symmetrical-triangle"],
  },
  {
    name: "Triple Top",
    slug: "triple-top",
    category: "reversal",
    direction: "bearish",
    reliability: "high",
    description: "A bearish reversal pattern where price tests the same resistance level three times and fails, creating three roughly equal peaks. The triple failure signals extreme selling pressure at that level.",
    formation: "Price rallies to resistance three times, each time failing to break through. The pullbacks between the peaks create two support troughs forming the neckline. The pattern completes when price breaks below the neckline on the third failure. Each peak should be within 3% of each other.",
    psychology: "Three failed attempts to break resistance demonstrate that sellers are firmly in control at that level. Each failure demoralizes buyers and emboldens sellers. By the third failure, buying interest is exhausted and a significant decline follows.",
    confirmationSignals: ["Volume typically decreases on each successive peak", "Neckline break on above-average volume", "RSI shows declining readings at each peak (bearish divergence)", "Third peak may be slightly lower than the first two"],
    targetCalculation: "Height from peaks to neckline, projected downward from the neckline break. Example: Peaks at $100, neckline at $92, target = $92 - $8 = $84.",
    commonMistakes: ["Calling the pattern before the third peak completes", "Not waiting for neckline confirmation", "Confusing with a trading range (no declining indicators)", "Setting targets without confirming volume"],
    bestTimeframes: "Daily and weekly charts. Triple tops forming over 2-6 months are most significant. 4-hour for shorter-term patterns.",
    relatedPatterns: ["triple-bottom", "double-top", "head-and-shoulders"],
  },
  {
    name: "Triple Bottom",
    slug: "triple-bottom",
    category: "reversal",
    direction: "bullish",
    reliability: "high",
    description: "A bullish reversal pattern where price tests the same support level three times and holds, creating three roughly equal troughs. The triple defense signals extremely strong buying at that level.",
    formation: "Price falls to support three times, each time bouncing back. The bounces between troughs create two resistance peaks forming the neckline. The pattern completes when price breaks above the neckline after the third bounce. Each trough should be within 3% of each other.",
    psychology: "Three successful defenses of support show persistent buying interest. Each time buyers step in at the same level, it reinforces that floor. By the third bounce, sellers give up and buying pressure drives price through the neckline.",
    confirmationSignals: ["Volume may increase on each successive bottom (accumulation)", "Neckline breakout on strong volume", "RSI bullish divergence — rising readings at each trough", "Third bottom may be slightly higher (early buying)"],
    targetCalculation: "Height from neckline to troughs, projected upward from the neckline breakout. Example: Troughs at $40, neckline at $46, target = $46 + $6 = $52.",
    commonMistakes: ["Buying before the neckline breakout", "Not confirming with volume", "Confusing with a descending triangle", "Ignoring the broader trend context"],
    bestTimeframes: "Daily and weekly for highest reliability. 4-hour for active swing trading. Pattern should develop over at least 6-12 weeks.",
    relatedPatterns: ["triple-top", "double-bottom", "inverse-head-and-shoulders"],
  },
  {
    name: "Hammer Candlestick",
    slug: "hammer",
    category: "candlestick",
    direction: "bullish",
    reliability: "medium",
    description: "A single-candle bullish reversal pattern with a small body at the top and a long lower shadow (at least 2× the body). Appears at the bottom of a downtrend, showing sellers pushed price down but buyers recovered.",
    formation: "The candle opens, sellers drive price significantly lower (creating the long lower shadow), but by the close, buyers push price back up near the open. The result is a small body at the top with a long lower wick. The body can be green (bullish) or red (less bullish but still valid).",
    psychology: "Sellers initially dominate, pushing price to the session's low. But buyers emerge with force, recovering nearly all losses by the close. This shift in intraday control — from sellers to buyers — at the bottom of a downtrend signals a potential reversal.",
    confirmationSignals: ["Must appear after a clear downtrend", "Lower shadow is at least 2× the body length", "Next candle closes above the hammer's high (confirmation)", "Higher volume on the hammer adds conviction", "Little to no upper shadow"],
    targetCalculation: "No specific measured move. Target the nearest resistance level or the origin of the preceding decline. Use the hammer's low as the stop-loss level.",
    commonMistakes: ["Trading the hammer without waiting for next-candle confirmation", "Seeing hammers in sideways markets (need preceding downtrend)", "Confusing with a hanging man (same shape, different context — top of uptrend)", "Ignoring the lower shadow length requirement"],
    bestTimeframes: "Most reliable on daily and weekly charts. 4-hour for active swing trading. 1-minute hammers are generally unreliable.",
    relatedPatterns: ["hanging-man", "bullish-engulfing", "morning-star"],
  },
  {
    name: "Shooting Star",
    slug: "shooting-star",
    category: "candlestick",
    direction: "bearish",
    reliability: "medium",
    description: "A single-candle bearish reversal pattern with a small body at the bottom and a long upper shadow (at least 2× the body). Appears at the top of an uptrend, showing buyers pushed price up but sellers recovered.",
    formation: "The candle opens, buyers drive price significantly higher (creating the long upper shadow), but by the close, sellers push price back down near the open. The result is a small body at the bottom with a long upper wick. The body can be red (bearish) or green (less bearish but still valid).",
    psychology: "Buyers initially push price to new highs, but sellers emerge with overwhelming force, pushing price back to the open. This intraday reversal at the top of an uptrend signals that buyers are losing control and sellers are taking over.",
    confirmationSignals: ["Must appear after a clear uptrend", "Upper shadow is at least 2× the body length", "Next candle closes below the shooting star's low (confirmation)", "Higher volume adds conviction", "Little to no lower shadow"],
    targetCalculation: "No specific measured move. Target the nearest support level or the origin of the preceding rally. Stop above the shooting star's high.",
    commonMistakes: ["Trading without next-candle confirmation", "Seeing shooting stars in sideways markets", "Confusing with an inverted hammer (same shape, different context — bottom of downtrend)", "Ignoring the upper shadow length requirement"],
    bestTimeframes: "Daily and weekly for strong signals. 4-hour for swing trades. Context matters more than timeframe.",
    relatedPatterns: ["hammer", "bearish-engulfing", "evening-star"],
  },
  {
    name: "Bullish Engulfing",
    slug: "bullish-engulfing",
    category: "candlestick",
    direction: "bullish",
    reliability: "high",
    description: "A two-candle bullish reversal pattern where a large green candle completely engulfs the prior red candle's body. The dramatic shift from selling to buying signals a powerful reversal at the bottom of a downtrend.",
    formation: "Day 1: A red (bearish) candle in a downtrend. Day 2: A green (bullish) candle opens below Day 1's close and closes above Day 1's open, completely engulfing the prior candle's body. The larger the engulfing candle relative to the prior candle, the stronger the signal.",
    psychology: "Day 1 continues the bearish sentiment. Day 2 opens with a gap down (maximum pessimism), then buyers overwhelm sellers, driving price above the prior day's open. This dramatic sentiment reversal — from gap-down to close higher — shows a fundamental shift in control.",
    confirmationSignals: ["Must appear at the bottom of a clear downtrend", "The bullish candle's body fully engulfs the bearish candle's body", "Volume on the engulfing candle is above average", "Next candle continues higher (follow-through)", "Occurs at a support level for added conviction"],
    targetCalculation: "Target the nearest resistance level. The magnitude of the engulfing pattern (size of the green candle) often hints at the strength of the reversal. Stop below the engulfing candle's low.",
    commonMistakes: ["The engulfing must be body-to-body (shadows don't count)", "Pattern loses meaning in a sideways market", "Not waiting for follow-through confirmation", "Ignoring the preceding trend requirement"],
    bestTimeframes: "Daily is the gold standard. Weekly for major reversals. 4-hour for swing trading. Intraday engulfing patterns are less reliable.",
    relatedPatterns: ["bearish-engulfing", "hammer", "morning-star"],
  },
  {
    name: "Bearish Engulfing",
    slug: "bearish-engulfing",
    category: "candlestick",
    direction: "bearish",
    reliability: "high",
    description: "A two-candle bearish reversal pattern where a large red candle completely engulfs the prior green candle's body. The dramatic shift from buying to selling signals a powerful reversal at the top of an uptrend.",
    formation: "Day 1: A green (bullish) candle in an uptrend. Day 2: A red (bearish) candle opens above Day 1's close and closes below Day 1's open, completely engulfing the prior candle's body. The larger the engulfing candle, the stronger the bearish signal.",
    psychology: "Day 1 continues bullish momentum. Day 2 opens with a gap up (maximum optimism), then sellers overpower buyers, driving price below the prior day's open. This gap-up-to-close-lower action represents a sharp sentiment reversal.",
    confirmationSignals: ["Must appear at the top of a clear uptrend", "Red candle's body fully engulfs the green candle's body", "Volume on the engulfing candle is above average", "Next candle continues lower (follow-through)", "Occurs at resistance for added conviction"],
    targetCalculation: "Target the nearest support level. Stop above the engulfing candle's high.",
    commonMistakes: ["Body-to-body engulfing (not shadow-to-shadow)", "Trading in sideways markets", "Not confirming with follow-through", "Ignoring volume"],
    bestTimeframes: "Daily for strongest signals. Weekly for major trend reversals. 4-hour for active traders.",
    relatedPatterns: ["bullish-engulfing", "shooting-star", "evening-star"],
  },
  {
    name: "Morning Star",
    slug: "morning-star",
    category: "candlestick",
    direction: "bullish",
    reliability: "high",
    description: "A three-candle bullish reversal pattern consisting of a large bearish candle, a small-bodied candle (indecision), and a large bullish candle. Signals the dawn of a new uptrend.",
    formation: "Candle 1: A large red candle continues the downtrend. Candle 2: A small-bodied candle (doji or spinning top) that gaps below the first candle, showing indecision. Candle 3: A large green candle that closes well into the first candle's body, confirming the reversal. The gap between candles 1-2 and/or 2-3 strengthens the signal.",
    psychology: "Candle 1 reflects strong selling. Candle 2 shows sellers losing conviction — the small body reveals equilibrium. Candle 3 confirms buyers have taken control with a strong recovery. The three-candle sequence shows a complete shift from bearish → indecision → bullish.",
    confirmationSignals: ["Candle 3 closes above the midpoint of Candle 1", "Volume increases on Candle 3", "Candle 2 is a doji or spinning top (small body)", "Pattern forms at a support level", "Follow-through buying on the next session"],
    targetCalculation: "Target the nearest resistance or the origin of the prior decline. Stop below the low of Candle 2 (the star).",
    commonMistakes: ["Candle 3 must close into Candle 1's body (not just a small green candle)", "All three candles are needed — don't trade on Candle 2 alone", "The pattern requires a preceding downtrend", "Gaps between candles are ideal but not always present in stocks"],
    bestTimeframes: "Daily and weekly for most reliable signals. The pattern spans 3 consecutive sessions on a daily chart.",
    relatedPatterns: ["evening-star", "hammer", "bullish-engulfing"],
  },
  {
    name: "Evening Star",
    slug: "evening-star",
    category: "candlestick",
    direction: "bearish",
    reliability: "high",
    description: "A three-candle bearish reversal pattern — the mirror of the Morning Star. Consists of a large bullish candle, a small-bodied candle (indecision), and a large bearish candle. Signals the end of an uptrend.",
    formation: "Candle 1: A large green candle continues the uptrend. Candle 2: A small-bodied candle that gaps above the first candle. Candle 3: A large red candle that closes well into the first candle's body. The star (Candle 2) at the top shows the turning point.",
    psychology: "Candle 1 shows strong buying. Candle 2 shows buyers losing momentum — equilibrium is reached. Candle 3 shows sellers taking decisive control. The complete sentiment arc — bullish → indecision → bearish — marks a top.",
    confirmationSignals: ["Candle 3 closes below the midpoint of Candle 1", "Volume increases on Candle 3", "Candle 2 has a very small body (ideally a doji)", "Pattern forms at resistance", "Follow-through selling on the next session"],
    targetCalculation: "Target the nearest support level. Stop above the high of Candle 2 (the star).",
    commonMistakes: ["Candle 3 must close deep into Candle 1's body", "Requires a preceding uptrend for validity", "Don't trade on Candle 2 alone", "Ensure the star actually shows indecision (small body)"],
    bestTimeframes: "Daily and weekly. Most reliable as a multi-day formation on a daily chart.",
    relatedPatterns: ["morning-star", "shooting-star", "bearish-engulfing"],
  },
  {
    name: "Doji",
    slug: "doji",
    category: "candlestick",
    direction: "both",
    reliability: "medium",
    description: "A single-candle indecision pattern where the open and close are virtually equal, creating a cross or plus-sign shape. Signals equilibrium between buyers and sellers, often preceding a reversal.",
    formation: "The candle opens and closes at nearly the same price, producing a very thin or non-existent body. The shadows (wicks) can vary: long-legged doji (long shadows both ways), dragonfly doji (long lower shadow, no upper), gravestone doji (long upper shadow, no lower). Each variation has slightly different implications.",
    psychology: "Neither buyers nor sellers gained control during the session. This equilibrium, after a sustained trend, suggests the trend may be losing momentum. The doji itself is neutral — context and confirmation determine its significance.",
    confirmationSignals: ["Most meaningful after a sustained trend (not in a range)", "Dragonfly doji at a bottom = bullish (like a hammer)", "Gravestone doji at a top = bearish (like a shooting star)", "Confirmation candle in the reversal direction is essential", "Higher volume on the doji increases significance"],
    targetCalculation: "No measured move. Use the doji's high/low as the breakout levels. Enter on confirmation candle, stop on the other side of the doji.",
    commonMistakes: ["Trading dojis in isolation without confirmation", "Seeing significance in dojis during range-bound markets", "Ignoring the preceding trend context", "Treating all doji variants the same"],
    bestTimeframes: "Most significant on daily and weekly charts. Intraday dojis are very common and less meaningful. Focus on dojis at key support/resistance levels.",
    relatedPatterns: ["hammer", "shooting-star", "morning-star", "evening-star"],
  },
];

export function getPatternBySlug(slug: string): ChartPattern | undefined {
  return PATTERNS.find(p => p.slug === slug);
}

export function getPatternHtml(slug: string): string | null {
  const p = getPatternBySlug(slug);
  if (!p) return null;

  const catMeta = CAT_META[p.category] || { label: p.category, color: "cyan" };
  const dirColor = DIR_COLORS[p.direction] || "cyan";
  const relColor = REL_COLORS[p.reliability] || "cyan";

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Trade the ${p.name} Pattern`,
    description: p.description,
    url: `${SITE_URL}/patterns/${p.slug}`,
    step: [
      { "@type": "HowToStep", position: 1, name: "Identify the Pattern", text: p.formation },
      { "@type": "HowToStep", position: 2, name: "Understand the Psychology", text: p.psychology },
      { "@type": "HowToStep", position: 3, name: "Confirm the Signal", text: p.confirmationSignals.join(". ") },
      { "@type": "HowToStep", position: 4, name: "Calculate the Target", text: p.targetCalculation },
    ],
  });

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;flex-wrap:wrap;">
      <span class="tag tag-${catMeta.color}">${catMeta.label}</span>
      <span class="tag tag-${dirColor}">${p.direction}</span>
      <span class="tag tag-${relColor}">Reliability: ${p.reliability}</span>
    </div>
    <h1>${escHtml(p.name)}</h1>
    <p>${escHtml(p.description)}</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:800px;margin:0 auto;">

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">How It Forms</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(p.formation)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#a855f7;">Market Psychology</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(p.psychology)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00e676;">Confirmation Signals</h2>
        <ul style="list-style:none;padding:0;">
          ${p.confirmationSignals.map(s => `<li style="color:rgba(255,255,255,0.7);font-size:14px;padding:8px 0;display:flex;gap:8px;align-items:baseline;border-bottom:1px solid rgba(255,255,255,0.03);"><span style="color:#00e676;font-size:10px;">●</span> ${escHtml(s)}</li>`).join("")}
        </ul>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">Price Target Calculation</h2>
        <div style="background:rgba(255,215,0,0.05);border-radius:12px;padding:20px;border:1px solid rgba(255,215,0,0.1);">
          <p style="color:rgba(255,255,255,0.8);line-height:1.8;font-size:14px;font-family:'JetBrains Mono',monospace;">${escHtml(p.targetCalculation)}</p>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#ff3366;">Common Mistakes</h2>
        <ul style="list-style:none;padding:0;">
          ${p.commonMistakes.map(m => `<li style="color:rgba(255,255,255,0.7);font-size:14px;padding:8px 0;display:flex;gap:8px;align-items:baseline;border-bottom:1px solid rgba(255,255,255,0.03);"><span style="color:#ff3366;font-size:10px;">✕</span> ${escHtml(m)}</li>`).join("")}
        </ul>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:15px;font-weight:700;margin-bottom:8px;color:rgba(255,255,255,0.5);">Best Timeframes</h2>
        <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;">${escHtml(p.bestTimeframes)}</p>
      </div>

      ${p.relatedPatterns.length ? `
      <div class="glass-card">
        <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:rgba(255,255,255,0.5);">Related Patterns</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${p.relatedPatterns.map(rp => {
            const related = PATTERNS.find(x => x.slug === rp);
            return related ? `<a href="/patterns/${rp}" style="text-decoration:none;"><span class="tag tag-gold">${escHtml(related.name)}</span></a>` : "";
          }).join("")}
        </div>
      </div>` : ""}

    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${p.name} Pattern — Chart Pattern Guide | EntangleWealth`,
    description: p.description,
    canonical: `${SITE_URL}/patterns/${p.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Chart Patterns", url: `${SITE_URL}/patterns` },
      { name: p.name, url: `${SITE_URL}/patterns/${p.slug}` },
    ],
  });
}

export function getPatternIndexHtml(): string {
  const grouped = new Map<string, ChartPattern[]>();
  for (const p of PATTERNS) {
    const arr = grouped.get(p.category) || [];
    arr.push(p);
    grouped.set(p.category, arr);
  }

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Chart Patterns Guide",
    description: `${PATTERNS.length} chart patterns — reversals, continuations, candlesticks, and harmonics with formation rules, psychology, and targets.`,
    url: `${SITE_URL}/patterns`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PATTERNS.length,
      itemListElement: PATTERNS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}/patterns/${p.slug}`,
      })),
    },
  });

  const catOrder = ["reversal", "continuation", "candlestick", "harmonic"];

  const body = `
  <div class="hero-section">
    <span class="tag tag-red" style="margin-bottom:16px;">Pattern Recognition</span>
    <h1>Chart Patterns Guide</h1>
    <p>${PATTERNS.length} essential chart patterns with formation rules, market psychology, confirmation signals, and price target calculations.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    ${catOrder.filter(c => grouped.has(c)).map(cat => {
      const items = grouped.get(cat)!;
      const meta = CAT_META[cat];
      return `
      <div style="margin-bottom:48px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span class="tag tag-${meta.color}">${meta.label}</span>
          <span style="color:rgba(255,255,255,0.3);font-size:13px;">${items.length} patterns</span>
        </div>
        <div class="grid-3">
          ${items.map(p => {
            const dirColor = DIR_COLORS[p.direction];
            const relColor = REL_COLORS[p.reliability];
            return `
          <a href="/patterns/${p.slug}" style="text-decoration:none;">
            <div class="glass-card" style="height:100%;">
              <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;">${escHtml(p.name)}</h3>
              <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin-bottom:12px;">${escHtml(p.description.slice(0, 120))}...</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <span class="tag tag-${dirColor}">${p.direction}</span>
                <span class="tag tag-${relColor}">${p.reliability}</span>
              </div>
            </div>
          </a>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return ssrHtmlShell({
    title: `Chart Patterns Guide — ${PATTERNS.length} Trading Patterns | EntangleWealth`,
    description: `Master ${PATTERNS.length} chart patterns. Reversal, continuation, and candlestick patterns with formation rules, psychology, confirmation signals, and price targets.`,
    canonical: `${SITE_URL}/patterns`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Chart Patterns", url: `${SITE_URL}/patterns` },
    ],
  });
}
