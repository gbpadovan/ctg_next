# Proposed New Features: Signal Noise Filter & Whipsaw Reduction

This document details future enhancements and quantitative improvements for the **Crypto to Gold (CTG) Indicator Terminal**.

---

## 1. Configurable Signal Noise Filter (Hysteresis Band & Confirmation Window)

### 1.1 Problem Statement
In the original CTG implementation, a signal is triggered strictly whenever the 4-week Rate of Change (ROC) crosses the zero baseline ($0.00\%$):
- **BUY Signal**: $\text{ROC}_t \ge 0$ and $\text{ROC}_{t-1} < 0$
- **SELL Signal**: $\text{ROC}_t < 0$ and $\text{ROC}_{t-1} \ge 0$

#### Observed Anomaly (Chart Clutter / Whipsaws):
During periods of market consolidation, low volatility, or sideways drift, the relative purchasing power ratio oscillates tightly around equilibrium. As a result:
- The ROC curve repeatedly fluctuates between small values like $+0.2\%$ and $-0.1\%$ day after day.
- This creates **clusters of rapid, consecutive BUY and SELL markers** (e.g., BUY $\rightarrow$ SELL $\rightarrow$ BUY within 2–5 days).
- In backtesting and live chart analysis, these rapid reversals produce unnecessary transaction costs, false trend signals, and visual chart clutter.

---

### 1.2 Proposed Solutions

#### Method 1: Symmetrical Hysteresis Threshold Band ($\pm \delta$)
Introduce a deadband around the zero line defined by a user-configurable parameter $\delta$ (default suggested: $\delta \in [1.0\%, 3.0\%]$):
- **BUY Signal (+1)** is only triggered when ROC crosses **above** $+\delta$:
  $$\text{ROC}_t \ge +\delta \quad \text{and} \quad \text{State}_{t-1} \neq \text{'buy'}$$
- **SELL Signal (-1)** is only triggered when ROC crosses **below** $-\delta$:
  $$\text{ROC}_t \le -\delta \quad \text{and} \quad \text{State}_{t-1} \neq \text{'sell'}$$
- **Neutral / Hold Zone ($-\delta < \text{ROC}_t < +\delta$)**: The current regime remains unchanged from the previous day ($\text{State}_t = \text{State}_{t-1}$). No signal flip occurs while ROC oscillates within the deadband.

```
+ ROC (%)
   |          /\
   |---------/--\-----------------  +delta (Buy Trigger Line)
   |        /    \
 0 |-------/------\---------------  Zero Equilibrium Line
   |      /        \
   |-----/----------\-------------  -delta (Sell Trigger Line)
   |                 \/
- ROC (%)
```

#### Method 2: Minimum Time Confirmation Window ($N$ Consecutive Days)
A crossover is only registered after the new regime holds for a continuous threshold of days:
- Require $\text{ROC} \ge 0$ for $N$ consecutive days (e.g. $N = 3$) before plotting a **BUY** marker.
- Require $\text{ROC} < 0$ for $N$ consecutive days before plotting a **SELL** marker.
- Eliminates 1-day noise spikes caused by weekend illiquidity or momentary wick anomalies.

#### Method 3: Smoothed Signal Line (MACD-style Trigger Line)
- Compute an Exponential Moving Average (EMA) or Simple Moving Average (SMA) of the ROC (e.g. 5-day or 9-day EMA).
- Signals can be generated on crossover between the **ROC line** and its **Signal Line**, providing smoother transitions similar to MACD or PPO indicators.

---

### 1.3 UI & UX Design Specification

1. **Dashboard Header / Chart Toolbar Controls**:
   - Add a **Noise Filter** dropdown or segmented toggle:
     - `Raw (0.0%)` — Classical unfilted model.
     - `Low (1.0%)` — Gentle noise filtering for short-term traders.
     - `Balanced (2.5%)` — Recommended default for clean macro swings.
     - `High (5.0%)` — Conservative macro filter for long-term holders.
     - `Custom Slider` — Slider allowing custom threshold selection from $0.0\%$ to $10.0\%$ in steps of $0.5\%$.

2. **TradingView Lightweight Charts Integration**:
   - In the ROC Oscillator pane, display two subtle dashed bands at $+\delta$ (light green) and $-\delta$ (light red) whenever a filter $> 0\%$ is active.
   - Clean up the marker layer: only significant regime flips produce chart arrows, dramatically improving visual clarity and readability.

3. **Historical Signal Table Integration**:
   - Filtered signals will reflect only meaningful macro trends.
   - The table will show realistic holding periods (e.g., 20–120 days) rather than 1-day whipsaw noise.

---

### 1.4 Technical Implementation Roadmap

1. **Update Indicator Engine (`src/lib/indicators/ctg.ts`)**:
   ```typescript
   export interface CTGOptions {
     mode?: 'rolling_daily' | 'weekly_interpolated';
     windowWeeks?: number;
     noiseThresholdPct?: number; // e.g. 0 to 5.0 (%)
     confirmationDays?: number;  // e.g. 1 to 5 days
     symbol?: string;
   }
   ```
2. **Update API Route Handlers**:
   - Support `noiseThreshold` query param: `GET /api/indicator/[symbol]?mode=rolling_daily&noiseThreshold=2.5`.
3. **Update Server Actions & Frontend State**:
   - Connect the UI slider/dropdown to `fetchIndicatorAction(symbol, mode, forceRefresh, noiseThreshold)`.
4. **Lightweight Charts Price Lines**:
   - Dynamically create horizontal guide lines at $+\delta$ and $-\delta$ on `rocSeries`.

---

## 2. Additional Roadmap Considerations

- **Multi-Asset Ratio Overlay**: Ability to compare BTC/Gold, ETH/Gold, and PLS/Gold on the same normalized oscillator pane.
- **Backtesting & Alpha Statistics**: Automated calculation of Buy & Hold return vs CTG Trend Following strategy return (Sharpe Ratio, Max Drawdown, Win Rate).
- **Email / Webhook Alerts**: Send Telegram or Discord notifications when a verified zero-line crossover signal occurs.
