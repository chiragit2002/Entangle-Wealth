# ⚛ ENTANGLEWEALTH — TRADINGVIEW REPLICA + AI SIGNAL ENGINE
## GODMODE REPLIT PROMPT — Paste Entire Document — Zero Shortcuts

---

## MISSION

Build a **professional-grade charting and AI analysis platform** that replicates TradingView's
full feature set inside EntangleWealth. Every major technical indicator must be calculated in
pure JavaScript from raw OHLCV data. An AI scanner then runs ALL indicators simultaneously
across a watchlist of 100+ stocks and ranks the best BUY signals, PUT candidates, and CALL
opportunities — outputting actionable trade setups with entry, target, stop, and confidence score.

This is the most technically complex module in the entire platform. Build it to production quality.

---

## TECH STACK — STRICT RULES

- **Single file addition**: All code goes into one `chart.html` (or integrate into `index.html`)
- **No frameworks**: Vanilla JS only. Zero dependencies except what's listed below.
- **Canvas rendering**: All charts drawn on HTML5 Canvas using 2D context. No SVG charting.
- **Chart library for sub-panes**: Chart.js from `https://cdn.jsdelivr.net/npm/chart.js` only
  for sub-indicator panes (RSI, MACD etc.) — main candlestick chart = pure Canvas
- **Data**: Yahoo Finance v8 API via CORS proxy `https://api.allorigins.win/get?url=`
- **AI Analysis**: Claude API via `https://api.anthropic.com/v1/messages`
  - Model: `claude-sonnet-4-20250514`
  - User must enter their Anthropic API key in settings (stored in localStorage, never sent anywhere else)
  - If no API key: fall back to rule-based signal engine (still works great)
- **Fonts**: Inter (UI) + JetBrains Mono (data/numbers) from Google Fonts

---

## VISUAL IDENTITY — TRADINGVIEW DNA

```css
:root {
  /* Core backgrounds — exact TradingView dark theme */
  --tv-bg:        #131722;    /* Main background */
  --tv-panel:     #1E222D;    /* Panel/toolbar background */
  --tv-card:      #2A2E39;    /* Card, tooltip background */
  --tv-input:     #2A2E39;    /* Input field background */
  --tv-border:    #363A45;    /* All borders */
  --tv-border2:   #2A2E39;    /* Subtle borders */

  /* Chart colors */
  --candle-up:    #26A69A;    /* Teal green — bullish candles */
  --candle-down:  #EF5350;    /* Red — bearish candles */
  --candle-wick:  #737375;    /* Wick color */
  --grid:         rgba(255,255,255,0.03);  /* Chart gridlines */
  --crosshair:    rgba(255,255,255,0.3);   /* Crosshair lines */

  /* Indicator line colors (TradingView defaults) */
  --ind-blue:     #2196F3;
  --ind-orange:   #FF9800;
  --ind-purple:   #9C27B0;
  --ind-teal:     #00BCD4;
  --ind-yellow:   #FFEB3B;
  --ind-pink:     #E91E63;
  --ind-green:    #4CAF50;
  --ind-red:      #F44336;
  --ind-white:    #FFFFFF;
  --ind-gray:     #787B86;

  /* Signal colors */
  --sig-strong-buy:   #00E676;
  --sig-buy:          #26A69A;
  --sig-neutral:      #787B86;
  --sig-sell:         #EF5350;
  --sig-strong-sell:  #FF1744;

  /* UI colors */
  --text:         #D1D4DC;
  --muted:        #787B86;
  --blue-btn:     #2962FF;    /* TradingView blue — primary button */
  --orange-acc:   #FF6D00;    /* Accent orange */

  /* Typography */
  --font-ui:      'Inter', sans-serif;
  --font-data:    'JetBrains Mono', monospace;
}
```

**Visual Rules:**
- Bullish candles: teal body + teal wick (`#26A69A`)
- Bearish candles: red body + red wick (`#EF5350`)
- All price/volume numbers: JetBrains Mono
- All UI labels: Inter, 11px, muted gray, uppercase, letter-spacing 0.5px
- Toolbar buttons: dark panel bg, rounded 4px, blue highlight on active
- Panels have NO rounded corners on chart borders — hard edges only
- Indicator lines: 1.5px weight minimum, 2px for primary line
- Watermark: ticker symbol centered in chart at 10% opacity

---

## FULL LAYOUT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: ⚛ CHARTS    [TICKER INPUT]   [TIMEFRAME BAR]  [SCAN]  │
├──────────────────┬──────────────────────────────────────────────┤
│  LEFT SIDEBAR    │  MAIN CHART AREA                             │
│  ─────────────   │  ┌────────────────────────────────────────┐  │
│  Watchlist       │  │  CHART TOOLBAR                         │  │
│  (100+ tickers)  │  │  [Indicators▼] [Draw▼] [Settings] [↗] │  │
│                  │  ├────────────────────────────────────────┤  │
│  ─────────────   │  │                                        │  │
│  AI Scanner      │  │  MAIN CANDLESTICK CHART (Canvas)       │  │
│  Results         │  │  (price scale on right, time on bottom)│  │
│                  │  │                                        │  │
│  ─────────────   │  ├────────────────────────────────────────┤  │
│  Alert List      │  │  SUB-PANE 1 (e.g. Volume + MACD)      │  │
│                  │  ├────────────────────────────────────────┤  │
│                  │  │  SUB-PANE 2 (e.g. RSI + Stoch)        │  │
│                  │  └────────────────────────────────────────┘  │
├──────────────────┴──────────────────────────────────────────────┤
│  BOTTOM PANEL: AI SIGNAL ENGINE RESULTS                         │
│  [BUY SIGNALS] [CALL SIGNALS] [PUT SIGNALS] [SCANNER STATUS]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE CANDLESTICK CHART ENGINE

Build a complete, professional chart renderer on HTML5 Canvas from scratch.

### Canvas Architecture:
```
MainChartCanvas    → price action, overlays, drawings
VolumeCanvas       → volume bars below main chart
CrosshairCanvas    → crosshair + tooltip overlay (top layer)
SubPane1Canvas     → first indicator sub-pane
SubPane2Canvas     → second indicator sub-pane
SubPane3Canvas     → third indicator sub-pane (if added)
```

All canvases are stacked via CSS `position: absolute` in a relative container.

### Candle Rendering:
```javascript
function drawCandle(ctx, candle, x, candleWidth, priceToY) {
  const bodyTop    = priceToY(Math.max(candle.open, candle.close));
  const bodyBottom = priceToY(Math.min(candle.open, candle.close));
  const wickTop    = priceToY(candle.high);
  const wickBottom = priceToY(candle.low);
  const isBull     = candle.close >= candle.open;
  const color      = isBull ? '#26A69A' : '#EF5350';
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1); // min 1px

  // Draw wick
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + candleWidth/2, wickTop);
  ctx.lineTo(x + candleWidth/2, wickBottom);
  ctx.stroke();

  // Draw body
  ctx.fillStyle = color;
  ctx.fillRect(x, bodyTop, candleWidth - 1, bodyHeight);
}
```

### Chart Features:
- **Scroll**: Click + drag left/right to pan through history
- **Zoom**: Mouse wheel zooms on time axis (15–500 candles visible at once)
- **Pinch zoom**: Two-finger pinch on mobile
- **Auto-scale**: Y-axis automatically fits visible candles
- **Lock Y-axis**: Optional fixed Y range
- **Crosshair**: Follows mouse — shows OHLCV values in top-left legend
- **Price line**: Horizontal line at current price (last close), dashed, labeled on Y-axis
- **Watermark**: Ticker + timeframe at 8% opacity, centered
- **Empty candles**: Show future time slots as empty (like TradingView)

### Price Scale (Y-axis, right side):
- Auto-calculated price levels (round numbers)
- Gridlines across chart for each level
- Current price badge: colored box with price on Y-axis
- High/Low labels on Y-axis for visible range

### Time Scale (X-axis, bottom):
- Auto-spaced time labels based on timeframe and zoom level
- Format rules:
  - 1m/5m/15m → "9:30", "9:45"
  - 1H/4H → "Apr 10", "9:00"
  - 1D/1W/1M → "Apr", "2024"
- Vertical gridlines at each label

### Timeframe Buttons:
`1m  5m  15m  30m  1H  4H  1D  1W  1M`
All active timeframes fetch from Yahoo Finance v8 API.

### Data Fetching by Timeframe:
```javascript
const TIMEFRAME_CONFIG = {
  '1m':  { interval: '1m',  range: '1d'   },
  '5m':  { interval: '5m',  range: '5d'   },
  '15m': { interval: '15m', range: '5d'   },
  '30m': { interval: '30m', range: '1mo'  },
  '1H':  { interval: '60m', range: '3mo'  },
  '4H':  { interval: '4h',  range: '6mo'  },
  '1D':  { interval: '1d',  range: '2y'   },
  '1W':  { interval: '1wk', range: '5y'   },
  '1M':  { interval: '1mo', range: '10y'  },
};
```

---

## COMPLETE INDICATOR LIBRARY

**Implement every indicator below in pure JavaScript, calculated from raw OHLCV arrays.**
**Every indicator must be toggleable (on/off), configurable (period, color, style), and**
**render either as a chart overlay or in a dedicated sub-pane.**

---

### GROUP 1: TREND INDICATORS (Chart Overlays)

#### 1.1 — Moving Averages (all render on main chart)

**SMA — Simple Moving Average**
- Formula: `SMA(n) = sum(close, n) / n`
- Default: 20, 50, 200
- User can add unlimited SMA lines with custom periods and colors
- Line style: solid, dashed, dotted

**EMA — Exponential Moving Average**
- Formula: `EMA(t) = close(t) × k + EMA(t-1) × (1-k)` where `k = 2/(n+1)`
- Defaults: 9, 21, 55
- Color: different from SMA by default

**WMA — Weighted Moving Average**
- Formula: weighted sum, most recent candle gets highest weight
- `WMA = (n×close[0] + (n-1)×close[1] + ... + 1×close[n-1]) / (n + n-1 + ... + 1)`

**DEMA — Double Exponential Moving Average**
- Formula: `DEMA = 2 × EMA(n) - EMA(EMA(n))`
- Reduces lag vs standard EMA

**TEMA — Triple Exponential Moving Average**
- Formula: `TEMA = 3×EMA - 3×EMA(EMA) + EMA(EMA(EMA))`

**HMA — Hull Moving Average**
- Formula: `HMA = WMA(2×WMA(n/2) - WMA(n), sqrt(n))`
- Very low lag — popular for signals

**VWMA — Volume-Weighted Moving Average**
- Formula: `VWMA = sum(close × volume, n) / sum(volume, n)`

**SMMA — Smoothed Moving Average (Wilder's)**
- Formula: `SMMA(t) = (SMMA(t-1) × (n-1) + close(t)) / n`

**LSMA — Least Squares Moving Average**
- Linear regression value — the "fitted line" endpoint
- Formula: linear regression on close prices over n periods

**ALMA — Arnaud Legoux Moving Average**
- Gaussian-weighted, phase/sigma configurable
- Less noise than EMA

**McGinley Dynamic**
- Self-adjusting speed, eliminates whipsaw
- Formula: `MD = MD[-1] + (close - MD[-1]) / (N × (close/MD[-1])^4)`

#### 1.2 — Bollinger Bands
- **Upper**: `SMA(20) + 2 × StdDev(20)`
- **Lower**: `SMA(20) - 2 × StdDev(20)`
- **Middle**: `SMA(20)`
- Fill between bands: 10% opacity
- Show **Bollinger Band Width**: `(Upper - Lower) / Middle` in sub-pane
- Show **%B**: `(Price - Lower) / (Upper - Lower)` in sub-pane
- Configurable: period (default 20), multiplier (default 2)

#### 1.3 — Keltner Channels
- **Middle**: EMA(20)
- **Upper**: EMA(20) + 2 × ATR(10)
- **Lower**: EMA(20) - 2 × ATR(10)

#### 1.4 — Donchian Channels
- **Upper**: highest high over n periods
- **Lower**: lowest low over n periods
- **Middle**: (Upper + Lower) / 2

#### 1.5 — Ichimoku Cloud (complete)
- **Tenkan-sen** (Conversion): `(highest high + lowest low) / 2` over 9 periods — blue line
- **Kijun-sen** (Base): `(highest high + lowest low) / 2` over 26 periods — red line
- **Senkou Span A** (Leading A): `(Tenkan + Kijun) / 2` plotted 26 periods ahead — upper cloud boundary
- **Senkou Span B** (Leading B): `(highest high + lowest low) / 2` over 52 periods, plotted 26 ahead — lower cloud boundary
- **Chikou Span** (Lagging): current close plotted 26 periods behind
- **Cloud fill**: green when Span A > Span B, red when Span B > Span A
- TK Cross signals: mark with ▲/▼ icons on chart

#### 1.6 — Parabolic SAR
- Formula: `SAR(t) = SAR(t-1) + α × (EP - SAR(t-1))`
  - α = acceleration factor (starts 0.02, max 0.20)
  - EP = extreme point (highest high in uptrend / lowest low in downtrend)
- Renders as dots above/below candles
- Dot color: green (below price = bullish) / red (above = bearish)
- Flip dots on trend reversal

#### 1.7 — Pivot Points (multiple types)
- **Standard**: `P = (H + L + C) / 3`, then R1/R2/R3, S1/S2/S3
- **Fibonacci**: Same P, then R/S levels at Fib ratios
- **Woodie**: `P = (H + L + 2C) / 4`
- **Camarilla**: 8 levels based on yesterday's range
- **DeMark**: conditional pivot formula
- Renders as dashed horizontal lines on chart with labels

#### 1.8 — VWAP (Volume-Weighted Average Price)
- Intraday only (1m, 5m, 15m, 30m, 1H)
- Resets each trading day
- Formula: `VWAP = cumsum(typical_price × volume) / cumsum(volume)`
- Optional: +1SD, +2SD, -1SD, -2SD bands
- Show as solid purple line on chart

#### 1.9 — Supertrend
- Formula:
  ```
  ATR = Wilder's ATR(10)
  BasicUpperBand = (H + L) / 2 + 3 × ATR
  BasicLowerBand = (H + L) / 2 - 3 × ATR
  Final bands adjusted based on direction flip
  ```
- Line changes color: green = uptrend, red = downtrend
- Place directional labels on chart: `BUY` on flip to green, `SELL` on flip to red

#### 1.10 — Alligator (Bill Williams)
- **Jaw** (13-period SMMA, shifted 8): blue
- **Teeth** (8-period SMMA, shifted 5): red
- **Lips** (5-period SMMA, shifted 3): green
- When lips cross above jaw/teeth = bullish signal

#### 1.11 — Gator Oscillator
- Sub-pane oscillator showing when Alligator is eating/sleeping
- `Upper = abs(Jaw - Teeth)`, `Lower = -abs(Teeth - Lips)`

---

### GROUP 2: MOMENTUM INDICATORS (Sub-Pane)

#### 2.1 — RSI — Relative Strength Index
- Formula: `RSI = 100 - (100 / (1 + RS))` where `RS = avg gain / avg loss` (Wilder's smoothing)
- Default period: 14
- **Overbought**: 70 (red dashed line)
- **Oversold**: 30 (green dashed line)
- **Neutral**: 50 (gray dashed line)
- Zone fills: red fill 70–100, green fill 0–30
- RSI line colored: green when below 50, red when above 50 (or solid purple — user choice)
- Signal: label `OB` when crosses above 70, `OS` when crosses below 30
- Show **RSI Divergence**: detect bullish/bearish divergence visually with lines
- Optional: **RSI-Smoothed** (SMA or EMA of RSI)
- Optional: Show RSI value in top legend

#### 2.2 — MACD — Moving Average Convergence Divergence
- Formula:
  ```
  MACD Line    = EMA(12) - EMA(26)
  Signal Line  = EMA(9) of MACD Line
  Histogram    = MACD Line - Signal Line
  ```
- Histogram: green bars when positive, red bars when negative
- Histogram bars: brighter when growing, darker when shrinking (4 colors total)
- MACD line: blue
- Signal line: orange
- Mark crossovers: ▲ when MACD crosses above Signal, ▼ below
- **MACD Divergence**: detect and draw divergence lines automatically
- Zero line labeled

#### 2.3 — Stochastic Oscillator
- Formula:
  ```
  %K = (close - lowest low over n) / (highest high - lowest low) × 100
  %D = SMA(3) of %K
  ```
- Default: (14, 3, 3)
- Overbought: 80, Oversold: 20
- %K: blue line, %D: orange line
- Fill zones: red above 80, green below 20
- **Stochastic RSI**: apply stochastic formula to RSI values instead of price

#### 2.4 — CCI — Commodity Channel Index
- Formula: `CCI = (typical_price - SMA) / (0.015 × mean_deviation)`
- +100 / -100 reference lines
- Overbought > +100, Oversold < -100

#### 2.5 — Williams %R
- Formula: `%R = (highest high - close) / (highest high - lowest low) × -100`
- Range: 0 to -100
- Overbought: -20, Oversold: -80

#### 2.6 — Momentum
- Formula: `MOM = close - close[n]`
- Simple and effective
- Default period: 10

#### 2.7 — Rate of Change (ROC / Price ROC)
- Formula: `ROC = (close - close[n]) / close[n] × 100`
- Shows percentage change over n periods

#### 2.8 — Ultimate Oscillator
- Formula: combines 3 periods (7, 14, 28):
  ```
  BP = close - min(low, prev_close)
  TR = max(high, prev_close) - min(low, prev_close)
  Avg7  = sum(BP, 7)  / sum(TR, 7)
  Avg14 = sum(BP, 14) / sum(TR, 14)
  Avg28 = sum(BP, 28) / sum(TR, 28)
  UO = 100 × (4×Avg7 + 2×Avg14 + Avg28) / 7
  ```
- Overbought: 70, Oversold: 30

#### 2.9 — Aroon Oscillator (full Aroon system)
- **Aroon Up**: `((n - periods since n-period high) / n) × 100`
- **Aroon Down**: `((n - periods since n-period low) / n) × 100`
- **Aroon Oscillator**: `Aroon Up - Aroon Down`
- Default period: 25
- Aroon Up: green line, Aroon Down: red line
- Oscillator: colored bar — green positive, red negative
- Signal: +90 = strong uptrend, -90 = strong downtrend

#### 2.10 — TRIX
- Formula: `TRIX = percentage change of triple-smoothed EMA`
- `EMA1 = EMA(close, n)`, `EMA2 = EMA(EMA1, n)`, `EMA3 = EMA(EMA2, n)`
- `TRIX = (EMA3 - EMA3[1]) / EMA3[1] × 100`
- Signal line: EMA(9) of TRIX

#### 2.11 — DPO — Detrended Price Oscillator
- Formula: `DPO = close[n/2 + 1 periods ago] - SMA(n)`
- Removes trend, shows cycles

#### 2.12 — Coppock Curve
- Long-term momentum, originally for monthly charts
- Formula: WMA(10) of (ROC(14) + ROC(11))
- Signal: cross above 0 = buy

#### 2.13 — KST — Know Sure Thing
- Multiple ROC values summed with smoothing
- Short, intermediate, long cycle combination

#### 2.14 — Elder Ray Index
- **Bull Power**: High - EMA(13)
- **Bear Power**: Low - EMA(13)
- Two histograms in one sub-pane

#### 2.15 — Chande Momentum Oscillator (CMO)
- Formula: `CMO = 100 × (sum_up - sum_down) / (sum_up + sum_down)`
- Range: -100 to +100

---

### GROUP 3: VOLUME INDICATORS

#### 3.1 — Volume (Standard)
- Bar chart below main chart (or in sub-pane)
- Green bars: up candles, Red bars: down candles
- Moving average overlay on volume: `SMA(20)` of volume as line
- Optional: normalize by average volume → show "relative volume"

#### 3.2 — OBV — On-Balance Volume
- Formula: `OBV += volume` if close > prev_close, `OBV -= volume` if close < prev_close
- Show OBV line and its SMA(20) overlay
- OBV Divergence detection

#### 3.3 — Volume Profile (Fixed Range)
- Horizontal histogram on right side of chart showing volume at each price level
- Highest volume level = POC (Point of Control) — marked in different color
- Value Area High (VAH) and Value Area Low (VAL) lines

#### 3.4 — VWAP + Standard Deviations
- Already in trend indicators — render in sub-pane if VWAP deviation mode selected

#### 3.5 — MFI — Money Flow Index
- Formula (RSI of money flow):
  ```
  Typical Price = (H + L + C) / 3
  Raw Money Flow = TP × Volume
  Positive MF: when TP > prev TP
  MFI = 100 - (100 / (1 + Positive MF / Negative MF))
  ```
- Overbought: 80, Oversold: 20

#### 3.6 — CMF — Chaikin Money Flow
- Formula: `sum((close - low - (high - close)) / (high - low) × volume, 20) / sum(volume, 20)`
- Range: -1 to +1
- Positive = buying pressure, negative = selling pressure

#### 3.7 — A/D Line — Accumulation/Distribution
- Formula:
  ```
  CLV = (close - low - (high - close)) / (high - low)
  A/D = A/D[prev] + CLV × volume
  ```

#### 3.8 — Chaikin Oscillator
- MACD of the A/D Line: `EMA(3) - EMA(10)` of A/D Line

#### 3.9 — Force Index
- Formula: `FI = (close - prev_close) × volume`
- Usually smoothed: EMA(13) of Force Index

#### 3.10 — Ease of Movement (EMV)
- Formula:
  ```
  Midpoint move = ((H + L)/2 - prev(H + L)/2)
  Box ratio = (volume / 100,000,000) / (H - L)
  EMV = midpoint_move / box_ratio
  ```

#### 3.11 — VWAP Session Bands
- Session-reset VWAP with 1SD, 2SD, 3SD bands above and below

---

### GROUP 4: VOLATILITY INDICATORS

#### 4.1 — ATR — Average True Range
- True Range: `max(H - L, |H - prev_C|, |L - prev_C|)`
- ATR: Wilder's smoothed average of TR over n periods (default 14)
- Show as line in sub-pane
- Optional: normalize as % of price (ATR%)

#### 4.2 — Bollinger Bands (already in trend — also show bandwidth in sub-pane)
- BBW = (Upper - Lower) / Middle
- Squeeze: when BBW hits 6-month low

#### 4.3 — Historical Volatility (HV)
- Formula: annualized standard deviation of log returns
- `HV = StdDev(log(close / prev_close), n) × sqrt(252) × 100`
- Compare to IV if options data available

#### 4.4 — Chaikin Volatility
- Formula: `EMA(H-L, 10)` period-over-period percentage change

#### 4.5 — Mass Index
- Formula: `sum(EMA(H-L,9) / EMA(EMA(H-L,9),9), 25)`
- "Reversal bulge" when crosses above 27 then drops below 26.5

#### 4.6 — NVI/PVI — Negative/Positive Volume Index
- NVI: changes only when volume decreases vs previous day
- PVI: changes only when volume increases

#### 4.7 — Ulcer Index
- Formula: measures downside volatility only
- `UI = sqrt(sum((pct_drawdown_from_peak)^2, n) / n)`

---

### GROUP 5: TREND STRENGTH INDICATORS

#### 5.1 — ADX — Average Directional Index (complete DMI system)
- **+DI**: positive directional indicator
- **-DI**: negative directional indicator
- **ADX**: smoothed average of DX
- Formula:
  ```
  +DM = H - prev_H (if positive and > |L - prev_L|, else 0)
  -DM = prev_L - L (if positive and > H - prev_H, else 0)
  TR  = Wilder's True Range
  +DI = 100 × EMA(+DM, n) / EMA(TR, n)
  -DI = 100 × EMA(-DM, n) / EMA(TR, n)
  DX  = 100 × |+DI - (-DI)| / |+DI + (-DI)|
  ADX = Wilder's smooth(DX, n)
  ```
- ADX > 25 = trending market
- ADX < 20 = ranging market
- +DI crosses above -DI = bullish, below = bearish
- Mark DMI cross signals on chart with ▲/▼

#### 5.2 — Vortex Indicator
- `VM+ = sum(|H - prev_L|, 14)`
- `VM- = sum(|L - prev_H|, 14)`
- `VIP = VM+ / ATR(14)`
- `VIM = VM- / ATR(14)`
- VIP > VIM = bullish trend

#### 5.3 — Directional Movement System
- Just the +DI / -DI without ADX (simpler view)

#### 5.4 — Linear Regression Slope
- Slope of linear regression over n periods
- Positive = uptrend, negative = downtrend

#### 5.5 — Correlation Coefficient (R²)
- Measures how well price fits a linear regression

---

### GROUP 6: SUPPORT / RESISTANCE

#### 6.1 — Fibonacci Retracement (Auto-Draw)
- Auto-detect swing high and swing low over visible range
- Draw Fib levels: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
- Optional extension levels: 127.2%, 161.8%, 261.8%
- Each level: dashed horizontal line + label

#### 6.2 — Pivot Points (already in trend group — also show S/R context)

#### 6.3 — Auto Support & Resistance
- Algorithm: find price levels where price reversed 3+ times
- Draw horizontal zones (thick transparent rectangles) at those levels

#### 6.4 — Fractal Levels (Bill Williams)
- Mark fractal highs: ▲ when high[2] is highest of 5 candles centered on it
- Mark fractal lows: ▼ when low[2] is lowest of 5 candles

---

### GROUP 7: OSCILLATORS (ADDITIONAL)

#### 7.1 — PPO — Percentage Price Oscillator
- Like MACD but expressed as percentage: `PPO = (EMA12 - EMA26) / EMA26 × 100`

#### 7.2 — PVO — Percentage Volume Oscillator
- Same as PPO but applied to volume

#### 7.3 — Awesome Oscillator (AO)
- Formula: `SMA(midpoints, 5) - SMA(midpoints, 34)` where midpoint = (H+L)/2
- Green bars when AO increases, red when decreases
- Zero line cross = signal

#### 7.4 — Accelerator Oscillator (AC)
- Formula: `AO - SMA(AO, 5)`
- Bill Williams acceleration indicator

#### 7.5 — DeMarker (DeM)
- Measures demand relative to prior period
- `DeMax = H - prev_H if positive, else 0`
- `DeMin = prev_L - L if positive, else 0`
- `DeM = SMA(DeMax, n) / (SMA(DeMax, n) + SMA(DeMin, n))`

#### 7.6 — Fisher Transform
- Converts prices to a near-Gaussian distribution
- Extreme values signal turning points

#### 7.7 — Ehler Fisher
- Variant of Fisher with cycle analysis

#### 7.8 — Schaff Trend Cycle (STC)
- MACD run through stochastic twice — faster and more responsive
- Overbought: 75, Oversold: 25

#### 7.9 — Commodity Channel Index (already listed — add seasonal mode)

#### 7.10 — Squeeze Momentum Indicator (Lazybear)
- Combines Bollinger Bands and Keltner Channels
- When BB inside KC = squeeze (black dots on zero line)
- Histogram: momentum direction
- Extremely popular for breakout identification

---

### GROUP 8: PATTERN RECOGNITION

#### 8.1 — Candlestick Pattern Detector
Auto-detect and label these patterns on the chart:
```
SINGLE CANDLE:
• Doji              • Spinning Top        • Hammer
• Inverted Hammer   • Hanging Man         • Shooting Star
• Marubozu (Bull/Bear)

TWO-CANDLE:
• Bullish Engulfing  • Bearish Engulfing
• Piercing Line      • Dark Cloud Cover
• Bullish Harami     • Bearish Harami
• Tweezer Top        • Tweezer Bottom

THREE-CANDLE:
• Morning Star       • Evening Star
• Three White Soldiers  • Three Black Crows
• Three Inside Up    • Three Inside Down
• Abandoned Baby

MULTI-CANDLE CHART PATTERNS (draw with lines):
• Head and Shoulders    • Inverse H&S
• Double Top            • Double Bottom
• Triple Top            • Triple Bottom
• Ascending Triangle    • Descending Triangle
• Symmetrical Triangle  • Wedge (Rising/Falling)
• Bull Flag             • Bear Flag
• Cup and Handle        • Rounding Bottom
```

Each detected pattern:
- Show icon on chart at the candle: ▲ bullish, ▼ bearish
- Hover = tooltip: pattern name, reliability %, expected move direction
- Panel below chart: list all patterns found in visible range

---

### GROUP 9: STATISTICAL / ADVANCED

#### 9.1 — Standard Deviation Channel
- Linear regression + 1SD, 2SD channels around it

#### 9.2 — ZLEMA — Zero Lag EMA
- Removes inherent lag from EMA calculation

#### 9.3 — VIDYA — Variable Index Dynamic Average
- Speed adjusts based on Chande's Momentum Oscillator

#### 9.4 — DEMA / TEMA (already in moving averages)

#### 9.5 — Fractal Adaptive Moving Average (FRAMA)
- Adjusts based on fractal dimension of price series

#### 9.6 — Kaufman Adaptive Moving Average (KAMA)
- Slows in ranging markets, speeds in trending markets

#### 9.7 — Regression Channel
- Auto-fit linear regression to n bars
- Show channel with 1SD and 2SD bands

#### 9.8 — Z-Score of Price
- How many standard deviations price is from its mean
- +2 = overbought, -2 = oversold by statistical measure

---

## INDICATOR PANEL SYSTEM

### Adding Indicators:
- Click "Indicators" button in toolbar → dropdown search panel
- Search bar filters in real-time
- Grouped by category
- Each indicator has:
  - ★ Favorite button
  - Info button (shows formula + description)
  - Default click = add with defaults
- After adding: small settings icon next to indicator name in legend = opens config panel

### Indicator Config Panel (per indicator):
- Period sliders with live preview
- Color pickers
- Line style: solid / dashed / dotted
- Line width: 1px / 1.5px / 2px
- Show/hide input values in legend
- Show/hide signals (for indicators with built-in signals)
- Delete button

### Layout Panels:
- Drag indicator name to move between sub-panes
- Resize sub-panes by dragging the divider between them
- Collapse a sub-pane (click arrow on left)
- Maximum 4 sub-panes open simultaneously

### Indicator Summary Panel (below ticker search):
Always-visible row showing current values of all active indicators:
```
RSI 14: 62.4 | MACD: +0.84 | BB%: 0.71 | ADX: 34.2 | STOCH 14,3: 78/71
```

---

## DRAWING TOOLS TOOLBAR

TradingView-style drawing tools (left sidebar):

```
Cursor tools:
↖  Select / Move
✛  Crosshair only

Line tools:
╱  Trend Line
↔  Horizontal Line
↕  Vertical Line
╱  Ray
╱  Extended Line
⬜  Horizontal Ray

Channels:
═  Parallel Channel
═  Regression Channel
═  Andrews' Pitchfork
═  Schiff Pitchfork

Fibonacci:
⫽  Fibonacci Retracement
⫽  Fibonacci Extension
⟲  Fibonacci Circle
⟳  Fibonacci Spiral
⊗  Fibonacci Speed Resistance Arcs

Shapes:
▭  Rectangle
⬭  Ellipse
△  Triangle
🎯  Price Label
🔤  Text Note

Price Tools:
|   Price Range
⟵⟶ Date Range
⌖  Price Note
```

All drawings:
- Persistent across timeframe changes (stored in localStorage)
- Draggable and resizable after placement
- Right-click = context menu (Edit, Duplicate, Delete, Lock)
- Magnetic snap to OHLC values when near candle

---

## AI SIGNAL SCANNER ENGINE

This is the crown jewel. The AI scanner runs all indicators across the watchlist simultaneously.

### Scanner Architecture:

```javascript
const AIScanner = {

  // Watchlist of 100+ tickers to scan
  UNIVERSE: [
    // Mega-cap
    'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK-B','AVGO','JPM',
    // Large-cap Tech
    'AMD','INTC','QCOM','TXN','MU','AMAT','LRCX','KLAC','MRVL','ORCL',
    // Finance
    'BAC','WFC','GS','MS','C','USB','PNC','TFC','SCHW','BLK',
    // Healthcare
    'UNH','JNJ','PFE','ABBV','MRK','TMO','ABT','DHR','AMGN','GILD',
    // Consumer
    'AMZN','WMT','HD','COST','NKE','MCD','SBUX','TGT','LOW','LULU',
    // Energy
    'XOM','CVX','COP','SLB','EOG','PXD','MPC','VLO','PSX','HAL',
    // ETFs
    'SPY','QQQ','IWM','DIA','GLD','TLT','HYG','XLK','XLF','XLE',
    // High-volatility / Options-popular
    'MSTR','COIN','RBLX','PLTR','SOFI','RIVN','LCID','GME','AMC','BBBY',
    // Crypto proxies
    'MARA','RIOT','HUT','CLSK','BTBT',
    // International / ADRs
    'TSM','BABA','NIO','BIDU','JD',
    // REITs
    'AMT','PLD','EQIX','SPG','O',
  ],

  results: {
    strongBuy: [],
    buy:       [],
    neutral:   [],
    sell:      [],
    strongSell:[],
    callSetups:[],
    putSetups: [],
  },

  async scanAll(progressCallback) {
    // Fetch daily OHLCV for all tickers (batch, respect rate limits)
    // Calculate ALL indicators for each ticker
    // Generate rule-based signal score
    // If API key available: send top 10 each to Claude for deep analysis
    // Sort and return results
  },

  calculateAllIndicators(ohlcv) {
    // Run every indicator calculation function
    // Return object with all indicator values + signals
    return {
      sma:     { sma20, sma50, sma200, crossover },
      ema:     { ema9, ema21, ema55 },
      bb:      { upper, middle, lower, pctB, bandwidth, squeeze },
      rsi:     { value, signal, divergence },
      macd:    { macd, signal, histogram, crossover, divergence },
      stoch:   { k, d, signal },
      adx:     { adx, plusDI, minusDI, trending },
      aroon:   { up, down, oscillator },
      atr:     { atr, atrPct },
      cci:     { value, signal },
      mfi:     { value, signal },
      obv:     { value, trend },
      supertrend: { value, direction },
      ichimoku: { above_cloud, tk_bullish, chikou_bullish },
      squeeze:  { active, momentum },
      patterns: { bullish_count, bearish_count, strongest },
      volume:   { relative, trend },
    };
  },

  scoreSignal(indicators) {
    let score = 50; // Start at neutral
    let bullPoints = 0, bearPoints = 0;
    let signals = [];

    // RSI
    if (indicators.rsi.value < 30) { bullPoints += 15; signals.push('RSI Oversold'); }
    if (indicators.rsi.value > 70) { bearPoints += 15; signals.push('RSI Overbought'); }
    if (indicators.rsi.divergence === 'bullish') { bullPoints += 12; signals.push('RSI Bull Divergence'); }
    if (indicators.rsi.divergence === 'bearish') { bearPoints += 12; signals.push('RSI Bear Divergence'); }

    // MACD
    if (indicators.macd.crossover === 'bullish') { bullPoints += 12; signals.push('MACD Cross Up'); }
    if (indicators.macd.crossover === 'bearish') { bearPoints += 12; signals.push('MACD Cross Down'); }
    if (indicators.macd.divergence === 'bullish') { bullPoints += 10; signals.push('MACD Bull Divergence'); }

    // ADX Trend
    if (indicators.adx.adx > 25) {
      if (indicators.adx.plusDI > indicators.adx.minusDI) { bullPoints += 10; signals.push('ADX Trending Up'); }
      else { bearPoints += 10; signals.push('ADX Trending Down'); }
    }

    // Moving Averages
    if (indicators.ema.ema9 > indicators.ema.ema21 && indicators.ema.ema21 > indicators.sma.sma50)
      { bullPoints += 8; signals.push('MA Stack Bullish'); }
    if (indicators.sma.crossover === 'golden') { bullPoints += 15; signals.push('Golden Cross'); }
    if (indicators.sma.crossover === 'death')  { bearPoints += 15; signals.push('Death Cross'); }

    // Bollinger Bands
    if (indicators.bb.pctB < 0.1) { bullPoints += 8; signals.push('BB Lower Touch'); }
    if (indicators.bb.pctB > 0.9) { bearPoints += 8; signals.push('BB Upper Touch'); }
    if (indicators.bb.squeeze)    { bullPoints += 6; signals.push('BB Squeeze'); }

    // Supertrend
    if (indicators.supertrend.direction === 1) { bullPoints += 10; signals.push('Supertrend Bullish'); }
    if (indicators.supertrend.direction === -1) { bearPoints += 10; signals.push('Supertrend Bearish'); }

    // Ichimoku
    if (indicators.ichimoku.above_cloud && indicators.ichimoku.tk_bullish)
      { bullPoints += 12; signals.push('Ichimoku Bullish'); }

    // Aroon
    if (indicators.aroon.oscillator > 70) { bullPoints += 8; signals.push('Aroon Strong Up'); }
    if (indicators.aroon.oscillator < -70) { bearPoints += 8; signals.push('Aroon Strong Down'); }

    // Volume
    if (indicators.volume.relative > 2 && bullPoints > bearPoints)
      { bullPoints += 10; signals.push('High Volume Confirmation'); }

    // Squeeze Momentum
    if (indicators.squeeze.active === false && indicators.squeeze.momentum > 0)
      { bullPoints += 15; signals.push('Squeeze Release UP'); }

    // Patterns
    bullPoints += indicators.patterns.bullish_count * 5;
    bearPoints += indicators.patterns.bearish_count * 5;

    const finalScore = 50 + (bullPoints - bearPoints);
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    return {
      score: clampedScore,
      direction: clampedScore > 65 ? 'BUY' : clampedScore < 35 ? 'SELL' : 'NEUTRAL',
      confidence: Math.abs(clampedScore - 50) * 2,
      signals,
      bullPoints,
      bearPoints,
    };
  },

  // Options signal generator
  scoreOptions(indicators, score, priceData) {
    const callScore = {
      recommended: score.score > 65,
      reason: [],
      setup: null,
    };
    const putScore = {
      recommended: score.score < 35,
      reason: [],
      setup: null,
    };

    // Call setup criteria
    if (indicators.bb.squeeze && score.score > 55) {
      callScore.recommended = true;
      callScore.reason.push('Volatility squeeze — IV likely to expand on breakout');
    }
    if (indicators.rsi.value > 50 && indicators.macd.crossover === 'bullish') {
      callScore.reason.push('MACD cross with RSI momentum — directional call opportunity');
    }

    // Put setup criteria
    if (indicators.rsi.value > 75 && indicators.macd.divergence === 'bearish') {
      putScore.recommended = true;
      putScore.reason.push('Extreme overbought + MACD divergence — reversal put opportunity');
    }

    // Generate specific option setup
    if (callScore.recommended) {
      callScore.setup = {
        type: 'CALL',
        strategy: score.confidence > 80 ? 'Long Call' : 'Bull Call Spread',
        expiry: '30-45 DTE recommended',
        delta: '0.40-0.50 target',
        iv_note: indicators.bb.bandwidth < 0.15 ? 'Low IV — BUY premium' : 'Elevated IV — consider spread',
      };
    }
    if (putScore.recommended) {
      putScore.setup = {
        type: 'PUT',
        strategy: score.confidence > 80 ? 'Long Put' : 'Bear Put Spread',
        expiry: '30-45 DTE recommended',
        delta: '-0.35 to -0.45 target',
        iv_note: indicators.atr.atrPct > 3 ? 'High IV — consider spread to reduce cost' : 'Reasonable IV — long put viable',
      };
    }

    return { callScore, putScore };
  }
};
```

---

## AI DEEP ANALYSIS (Claude API)

When user provides Anthropic API key, send top candidates for deep AI analysis:

```javascript
async function analyzeWithAI(ticker, ohlcv, indicators, signalScore) {
  const prompt = `You are an expert stock and options trader analyzing ${ticker}.

PRICE DATA (last 5 bars):
${formatOHLCV(ohlcv.slice(-5))}

CURRENT INDICATORS:
RSI(14): ${indicators.rsi.value.toFixed(1)} — ${indicators.rsi.signal}
MACD: ${indicators.macd.macd.toFixed(2)} | Signal: ${indicators.macd.signal.toFixed(2)} | Hist: ${indicators.macd.histogram.toFixed(2)}
ADX: ${indicators.adx.adx.toFixed(1)} | +DI: ${indicators.adx.plusDI.toFixed(1)} | -DI: ${indicators.adx.minusDI.toFixed(1)}
BB%B: ${indicators.bb.pctB.toFixed(2)} | Squeeze: ${indicators.bb.squeeze}
Supertrend: ${indicators.supertrend.direction === 1 ? 'BULLISH' : 'BEARISH'}
Aroon Up/Down: ${indicators.aroon.up}/${indicators.aroon.down}
Stochastic K/D: ${indicators.stoch.k.toFixed(1)}/${indicators.stoch.d.toFixed(1)}
Volume vs Avg: ${(indicators.volume.relative).toFixed(1)}x
Patterns Detected: ${indicators.patterns.strongest.join(', ') || 'None'}
Rule-Based Score: ${signalScore.score}/100

Provide a JSON response (ONLY JSON, no other text):
{
  "summary": "2-sentence trader assessment",
  "direction": "STRONG BUY | BUY | NEUTRAL | SELL | STRONG SELL",
  "confidence": 0-100,
  "entry": suggested entry price or range,
  "target": price target,
  "stop": stop loss level,
  "risk_reward": ratio,
  "timeframe": "expected holding period",
  "call_setup": {
    "recommended": true/false,
    "strike": "suggestion",
    "expiry": "suggestion",
    "strategy": "Long Call / Bull Call Spread / etc",
    "reasoning": "1 sentence"
  },
  "put_setup": {
    "recommended": true/false,
    "strike": "suggestion",
    "expiry": "suggestion",
    "strategy": "Long Put / Bear Put Spread / etc",
    "reasoning": "1 sentence"
  },
  "key_levels": ["price level with label"],
  "risks": ["main risk 1", "main risk 2"],
  "catalysts": ["upcoming catalyst if known"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}
```

---

## SCANNER RESULTS UI (Bottom Panel)

### Three Signal Tabs:

**BUY SIGNALS tab:**
```
RANK  TICKER  PRICE   SCORE    SIGNALS FIRED                          ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1   AMD     $162.75  94/100  Golden Cross · RSI Oversold · Squeeze    [CHART] [DEEP ANALYZE]
  2   META    $512.30  89/100  MACD Bull Cross · Supertrend · High Vol  [CHART] [DEEP ANALYZE]
  3   AAPL    $175.84  82/100  BB Bounce · ADX Trending · Aroon Up      [CHART] [DEEP ANALYZE]
  4   MU      $98.40   79/100  Ichimoku Bullish · RSI Bull Div          [CHART] [DEEP ANALYZE]
  ...
```

**CALL SIGNALS tab:**
```
TICKER  PRICE    CALL SETUP              IV NOTE         SCORE   AI PICK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NVDA    $875.40  900C May17 · 0.40Δ    Low IV — BUY    96/100  ★ AI PICK
AMD     $162.75  170C May23 · 0.45Δ    Normal IV       88/100
META    $512.30  530C Apr26 · 0.42Δ    Squeeze exit    85/100
SPY     $542.10  550C Apr19 · 0.35Δ    Low IV — BUY    78/100
```

**PUT SIGNALS tab:**
```
TICKER  PRICE    PUT SETUP               IV NOTE           SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TSLA    $198.45  185P May16 · -0.40Δ   High IV — SPREAD  92/100
MSTR    $156.00  140P May09 · -0.45Δ   Extreme IV        84/100
COIN    $210.00  195P Apr26 · -0.38Δ   High IV — SPREAD  79/100
```

Each row: click [CHART] = loads that ticker in main chart with all indicators
Click [DEEP ANALYZE] = runs full Claude AI analysis, opens results modal

### AI Analysis Modal:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚛ AI DEEP ANALYSIS — AMD                                       │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  DIRECTION:  ★★★★★  STRONG BUY   Confidence: 94%               │
│                                                                  │
│  "AMD is breaking out of a 6-week consolidation on volume 3x    │
│  the 20-day average. MACD bullish cross confirmed with RSI       │
│  recovering from oversold at 44 — ideal entry window."          │
│                                                                  │
│  TRADE SETUP ─────────────────────────────────────────────────  │
│  Entry:       $158.00 – $163.00                                 │
│  Target:      $178.00  (+10.6%)                                 │
│  Stop Loss:   $153.00  (-3.1%)                                  │
│  Risk/Reward:  1 : 3.4                                          │
│  Timeframe:   2-4 weeks                                         │
│                                                                  │
│  CALL SETUP ──────────────────────────────────────────────────  │
│  ★ RECOMMENDED                                                  │
│  Strategy:    Long Call (IV is low — favorable to buy premium)  │
│  Strike:      $170 Call                                         │
│  Expiry:      May 23 (45 DTE)                                   │
│  Delta target: 0.40-0.45                                        │
│  "Low IV environment makes outright calls attractive over        │
│  spreads. Target move to $178 would put this deep ITM."         │
│                                                                  │
│  KEY LEVELS ──────────────────────────────────────────────────  │
│  $155.00  Major support (200-day SMA)                           │
│  $168.50  Prior resistance (now target resistance)              │
│  $178.00  Price target (measured move from base)                │
│                                                                  │
│  RISKS ────────────────────────────────────────────────────────  │
│  • Broad market selloff could invalidate setup                  │
│  • Earnings in 6 weeks — IV will expand closer to date          │
│                                                                  │
│  CATALYSTS ────────────────────────────────────────────────────  │
│  • AI chip demand news                                          │
│  • Analyst upgrade cycle                                        │
│                                                                  │
│  [OPEN CHART]   [SET ALERT AT $163.00]   [CLOSE]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRICE ALERTS SYSTEM

- Right-click any price level on chart = "Set Alert Here"
- Alert panel in left sidebar: list of all active alerts
- localStorage persistence
- On price hit (detected on next data refresh): browser notification + flash the ticker row orange
- Alert types:
  - Price crosses above X
  - Price crosses below X
  - RSI crosses above/below threshold
  - MACD bullish/bearish crossover
  - ADX crosses above 25 (trend starting)
  - Bollinger Band squeeze start/end
  - Volume exceeds N×average

---

## WATCHLIST MANAGEMENT

- Default: 12 tickers pre-loaded
- Add ticker: type in search box → dropdown from known universe
- Remove: hover row → ✕ button appears
- Reorder: drag and drop
- Multiple watchlists: create/rename/delete
- Color-tag rows: right-click → color picker
- Notes on tickers: right-click → "Add note"
- Export watchlist as text/CSV
- Import watchlist from CSV

---

## CHART SETTINGS PANEL

Settings gear icon → opens right-side panel:

**Chart:**
- Background color
- Candle style: Candles / Hollow Candles / Heikin-Ashi / Renko / Line Break / Kagi
- Show/hide: Volume, Watermark, Grid, Crosshair, Date range, Price range

**Heikin-Ashi Mode:**
- Special candle type that smooths noise
- Formula: `HA_Close = (O+H+L+C)/4`, `HA_Open = (prev_HA_O + prev_HA_C)/2`

**Renko Mode:**
- Only draws new bricks when price moves by a set amount (e.g. $5)
- Filters out time, shows pure price action

**Scale:**
- Regular vs Log scale toggle
- Auto-scale toggle

**Sessions:**
- Highlight pre-market / after-hours periods
- Show/hide weekends

---

## PERFORMANCE REQUIREMENTS

- Chart must render 2000+ candles smoothly at 60fps
- Use `requestAnimationFrame` for all rendering — never `setInterval` for drawing
- Only re-render changed portions (dirty rectangle optimization)
- Indicator calculations: use typed arrays (`Float64Array`) for performance
- Memoize indicator results: only recalculate when data changes or settings change
- API calls: rate limit to max 2 concurrent Yahoo Finance requests
- Lazy-load: only calculate indicators when their sub-pane is visible

---

## KEYBOARD SHORTCUTS

```
Arrow Left/Right    Scroll chart left/right
+ / -               Zoom in/out
Alt + 1-9           Switch timeframe
A                   Toggle all indicators on/off
C                   Clear all drawings
D                   Toggle drawing mode
F                   Full-screen chart
L                   Toggle log scale
R                   Reset zoom to default view
S                   Run scanner
Ctrl+Z              Undo last drawing
/                   Focus ticker search
Escape              Deselect tool
```

---

## BUILD ORDER

Execute in this exact sequence. Do not skip ahead.

1. CSS design system (colors, fonts, layout skeleton)
2. Left sidebar with static watchlist + ticker search
3. Main chart canvas + coordinate system (no data yet)
4. Yahoo Finance data fetcher + CORS proxy integration
5. Candlestick renderer (pure canvas)
6. Price scale (Y-axis) + time scale (X-axis)
7. Pan and zoom interactions
8. Crosshair + OHLCV tooltip
9. Timeframe buttons + data switching
10. Volume bars sub-pane
11. ALL moving average calculations (SMA, EMA, WMA, DEMA, TEMA, HMA, VWMA, SMMA, ALMA, LSMA)
12. Bollinger Bands overlay + BBW + %B sub-pane
13. Keltner Channels, Donchian Channels
14. RSI sub-pane (full: zones, divergence labels)
15. MACD sub-pane (histogram + lines + crossover marks)
16. Stochastic + Stochastic RSI
17. ADX / DMI full system
18. ALL remaining momentum indicators (CCI, Williams%R, ROC, UO, Aroon, TRIX, CMO, etc.)
19. ALL volume indicators (OBV, MFI, CMF, A/D, Chaikin, Force Index)
20. Ichimoku Cloud (complete, with cloud fill)
21. Parabolic SAR (dots on chart)
22. Supertrend (colored line + labels)
23. Alligator + Gator
24. VWAP + session bands
25. Pivot Points (all types)
26. Squeeze Momentum Indicator
27. Auto Fibonacci Retracement
28. Candlestick Pattern Detector (all patterns)
29. Chart Pattern Recognition (triangles, flags, H&S etc.)
30. Drawing tools toolbar + interaction
31. Indicator add/remove/configure system
32. AI Scanner — rule-based scoring engine
33. Scanner results UI (buy/call/put tabs)
34. Claude API integration + AI analysis modal
35. Price alerts system
36. Watchlist management (multi-list, reorder, notes)
37. Heikin-Ashi + Renko chart types
38. Settings panel
39. Keyboard shortcuts
40. Mobile responsive pass (touch panning, pinch zoom)
41. Full QA: test every indicator with real NVDA daily data

---

## LEGAL DISCLAIMER (Add to UI)

Show this in a small footer below the scanner:
```
⚖️ All signals are for educational purposes only. Not financial advice.
Options trading involves substantial risk of loss. Past performance does
not guarantee future results. Always do your own research.
```

---

## FINAL CHECKLIST — DO NOT SUBMIT UNTIL ALL ✓

Chart Engine:
- [ ] Candlestick chart renders correctly (bull teal, bear red)
- [ ] Pan and zoom work smoothly
- [ ] Crosshair shows exact OHLCV values
- [ ] All 9 timeframes fetch and display correctly
- [ ] Y-axis auto-scales to visible candles
- [ ] X-axis time labels format correctly per timeframe
- [ ] Heikin-Ashi mode renders correctly
- [ ] Volume bars color correctly (green up, red down)

Indicators (verify each calculates correctly against known values):
- [ ] SMA 20/50/200 all visible and accurate
- [ ] EMA 9/21/55 accurate
- [ ] Bollinger Bands (upper/lower/middle) accurate
- [ ] RSI 14 — test: RSI should be ~62 on NVDA recent daily
- [ ] MACD (12,26,9) — histogram sign matches expectations
- [ ] Stochastic (14,3,3) — overbought/oversold zones correct
- [ ] ADX + DMI — ADX > 25 on trending tickers confirmed
- [ ] Aroon — shows 100/0 after strong trend
- [ ] Ichimoku Cloud — cloud fills correctly
- [ ] Parabolic SAR — dots flip on trend reversal
- [ ] Supertrend — direction flips with color change
- [ ] Squeeze Momentum — dots appear during low volatility
- [ ] All volume indicators calculate without NaN
- [ ] Fibonacci retracement auto-draws on correct swing

Scanner:
- [ ] Scanner runs on full watchlist (no crash)
- [ ] Buy signals tab shows tickers sorted by score
- [ ] Call signals tab generates specific option setups
- [ ] Put signals tab generates specific option setups
- [ ] AI analysis modal renders full JSON response
- [ ] Alert fires when price condition met

General:
- [ ] Chart renders 2000 candles without lag
- [ ] All keyboard shortcuts work
- [ ] Mobile: touch pan and pinch zoom work
- [ ] localStorage saves watchlist and drawings
- [ ] No console errors during normal use
- [ ] Disclaimer visible in UI

Output the complete `chart.html` file. Every feature listed must be present and functional.
