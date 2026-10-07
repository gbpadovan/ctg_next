# Crypto to Gold (CTG) Indicator: Migration Guide to Next.js, TypeScript & Neon Serverless

This document outlines the complete architectural analysis of the original Python CTG indicator project and provides a comprehensive, step-by-step roadmap to migrate it into a modern, full-stack application using **Next.js**, **TypeScript**, **Node.js**, **Neon Serverless PostgreSQL**, and modern JavaScript financial libraries.

---

## 1. Analysis of the Original Python Project

### 1.1 Core Concept & Formula
The **CTG (Crypto to Gold) Indicator** is inspired by Michael Silva's *"Saylor to Schiff Indicator"*. It evaluates the purchasing power and momentum of a cryptocurrency denominated in Gold rather than USD.

The workflow consists of:
1. **Ratio Calculation**:
   $$\text{Ratio}_t = \frac{\text{Token Price}_t}{\text{Gold Price}_t}$$
   *(Gold is historically represented by COMEX Gold Futures `GC=F`).*
2. **Weekly Resampling**:
   Resamples daily data to weekly closes (default: `"W-SUN"`, every Sunday).
3. **Rate of Change (ROC)**:
   Computes a 4-week Rate of Change on the ratio:
   $$\text{ROC}_{4W}(t) = \left( \frac{\text{Ratio}_t - \text{Ratio}_{t-4}}{\text{Ratio}_{t-4}} \right) \times 100$$
4. **Linear Interpolation**:
   Interpolates weekly ROC values daily to produce a smooth continuous curve.
5. **Signal Generation (Buy / Sell / Hold)**:
   - **Buy Signal ($+1$)**: ROC crosses above zero ($\text{ROC}_t \ge 0$ and $\text{ROC}_{t-1} < 0$).
   - **Sell Signal ($-1$)**: ROC crosses below zero ($\text{ROC}_t < 0$ and $\text{ROC}_{t-1} \ge 0$).
   - **Hold / Neutral ($0$)**: No crossover.

### 1.2 Data Sources & Legacy Storage
- **Gold Data** (`golddata.py`): Fetched from Yahoo Finance (`yfinance` / `pandas_datareader`) using ticker `'GC=F'`.
- **Crypto Historical Data** (`tokendata.py`, `quoteapis.py`): Fetched from CoinGecko API (`/coins/{token}/history?date=dd-mm-yyyy`) with rate limiting (30 req/min).
- **Crypto Live Quotes** (`quoteapis.py`): DexScreener API (`/dex/pairs/{chain}/{pair_address}`) for decentralized pairs like PulseChain/PulseX.
- **Data Persistence**:
  - `token_database/{token}.pkl`: Serialized Python Pandas DataFrames.
  - `support/dataset_updates.pkl`: Metadata tracking last update date per asset.
  - `support/token_pairs.xlsx`: Excel file mapping token names, pools, and DEX pair contract addresses.
- **Visualization** (`charts.py`): Matplotlib static 2D line plot.

### 1.3 Key Problem Highlighted in Python Code
As noted in `README.md`, calculating a 4-week weekly ROC and projecting the current mid-week price to the coming Sunday causes historical revisions when daily linear interpolation is applied. In the TypeScript reimplementation, we can support both:
1. **Classic Weekly Interpolation**: Exact replica of the original model.
2. **Rolling 28-Day Daily ROC**: A true daily rolling window ($t$ vs $t - 28 \text{ days}$) that eliminates recalculation anomalies and provides real-time consistency.

---

## 2. Technology Stack & Library Mapping

| Component | Python Stack | Node.js / TypeScript Stack | Justification |
| :--- | :--- | :--- | :--- |
| **Framework** | None (Script / Notebook) | **Next.js 15 (App Router)** | Full-stack React, Server Actions, Route Handlers, built-in cron/caching. |
| **Language** | Python 3.10+ | **TypeScript 5.x** | Strong static typing for financial data structures and DB schemas. |
| **Database** | `.pkl` files & `.xlsx` | **Neon Serverless Postgres** | Scalable, serverless PostgreSQL with branching, connection pooling, and HTTP/WebSocket drivers. |
| **ORM / Query Builder** | Pandas read/to_pickle | **Drizzle ORM** (or Prisma) | Lightweight, edge-ready, zero-overhead SQL schema and migrations. |
| **Financial / Crypto Data** | `yfinance` & `requests` | **`yahoo-finance2`** + **DexScreener API** | Free, open-source Yahoo Finance client for Gold (`GC=F`) and major crypto (`BTC-USD`, `ETH-USD`), plus native DEX endpoints for on-chain tokens. |
| **Data Manipulation** | `pandas` & `numpy` | **`arquero`** or **Native TS Math Pipeline** | Fast vector-like data manipulation and linear interpolation without heavy native C++ dependencies. |
| **Technical Analysis** | `ta` (`ta.momentum.ROCIndicator`) | **`technicalindicators`** or Custom TS Engine | `ROC` calculation available in `technicalindicators` (`ROC.calculate({ period: 4, values: [...] })`) + standalone typed pure functions. |
| **Visualization** | `matplotlib` | **Lightweight Charts** (TradingView) | High-performance canvas-based financial charts, pan/zoom, multiple panes, buy/sell markers. |

---

## 3. Neon Serverless Database Design

Replace `.pkl` files and `token_pairs.xlsx` with relational tables in Neon Serverless Postgres.

```
       +-----------------------+
       |        tokens         |
       +-----------------------+
       | id (UUID / serial)    |
       | symbol (e.g. BTC, PLS)|
       | name                  |
       | source_type           | <--- 'yahoo' | 'dexscreener' | 'coingecko'
       | source_identifier     | <--- 'BTC-USD' | pair_address
       | chain                 |
       +-----------+-----------+
                   | 1
                   |
                   | N
       +-----------v-----------+          +-----------------------+
       |     token_prices      |          |      gold_prices      |
       +-----------------------+          +-----------------------+
       | id                    |          | id                    |
       | token_id (FK)         |          | date (DATE, UNIQUE)   |
       | date (DATE)           |          | open (NUMERIC)        |
       | open (NUMERIC)        |          | high (NUMERIC)        |
       | high (NUMERIC)        |          | low (NUMERIC)         |
       | low (NUMERIC)         |          | close (NUMERIC)       |
       | close (NUMERIC)       |          | volume (NUMERIC)      |
       | volume (NUMERIC)      |          +-----------------------+
       | market_cap (NUMERIC)  |
       +-----------------------+
                   |
                   +---------------------------+
                                               |
                                   +-----------v-----------+
                                   |      sync_history     |
                                   +-----------------------+
                                   | id                    |
                                   | asset_type            |
                                   | asset_id              |
                                   | last_synced_date      |
                                   | status                |
                                   +-----------------------+
```

### 3.1 Drizzle ORM Schema (`src/db/schema.ts`)

```typescript
import { pgTable, serial, text, numeric, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(), // e.g. "BTC", "PLS", "HEX"
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(), // 'yahoo' | 'dexscreener' | 'coingecko'
  sourceIdentifier: text('source_identifier').notNull(), // 'BTC-USD' or '0x...'
  chain: text('chain'), // 'pulsechain', 'ethereum', etc.
  quoteToken: text('quote_token').default('USD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tokenPrices = pgTable('token_prices', {
  id: serial('id').primaryKey(),
  tokenId: serial('token_id').references(() => tokens.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  open: numeric('open', { precision: 24, scale: 10 }).notNull(),
  high: numeric('high', { precision: 24, scale: 10 }).notNull(),
  low: numeric('low', { precision: 24, scale: 10 }).notNull(),
  close: numeric('close', { precision: 24, scale: 10 }).notNull(),
  volume: numeric('volume', { precision: 28, scale: 4 }),
  marketCap: numeric('market_cap', { precision: 28, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tokenDateIdx: uniqueIndex('token_date_unique_idx').on(t.tokenId, t.date),
  dateIdx: index('token_prices_date_idx').on(t.date),
}));

export const goldPrices = pgTable('gold_prices', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  open: numeric('open', { precision: 16, scale: 4 }).notNull(),
  high: numeric('high', { precision: 16, scale: 4 }).notNull(),
  low: numeric('low', { precision: 16, scale: 4 }).notNull(),
  close: numeric('close', { precision: 16, scale: 4 }).notNull(),
  volume: numeric('volume', { precision: 20, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  dateIdx: index('gold_prices_date_idx').on(t.date),
}));

export const syncHistory = pgTable('sync_history', {
  id: serial('id').primaryKey(),
  target: text('target').notNull(), // 'GOLD' or token symbol
  lastDateSynced: date('last_date_synced').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 4. Open-Source Data Fetching Architecture

### 4.1 Gold Price Provider: `yahoo-finance2`
Fetch historical and latest quotes for Gold Futures (`'GC=F'`), capturing full **OHLCV** (Open, High, Low, Close, Volume):

```typescript
// src/lib/data/gold.ts
import yahooFinance from 'yahoo-finance2';

export interface OHLCVPoint {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export async function fetchGoldHistorical(startDate: string, endDate?: string): Promise<OHLCVPoint[]> {
  const queryOptions = {
    period1: startDate,
    period2: endDate || new Date().toISOString().split('T')[0],
    interval: '1d' as const,
  };

  const results = await yahooFinance.historical('GC=F', queryOptions);

  return results
    .filter((row) => row.close !== null && row.close !== undefined)
    .map((row) => ({
      date: row.date.toISOString().split('T')[0],
      open: row.open ?? row.close,
      high: row.high ?? row.close,
      low: row.low ?? row.close,
      close: row.close,
      volume: row.volume ?? 0,
    }));
}
```

### 4.2 Crypto Price Providers
#### A. Major Cryptos (Yahoo Finance)
Supports full daily candlestick quotes out-of-the-box for `BTC-USD`, `ETH-USD`, `SOL-USD`, etc.:
```typescript
// src/lib/data/crypto-yahoo.ts
import yahooFinance from 'yahoo-finance2';
import { OHLCVPoint } from './gold';

export async function fetchYahooCryptoHistorical(symbol: string, startDate: string): Promise<OHLCVPoint[]> {
  const results = await yahooFinance.historical(`${symbol}-USD`, {
    period1: startDate,
    interval: '1d',
  });

  return results
    .filter((row) => row.close !== null && row.close !== undefined)
    .map((row) => ({
      date: row.date.toISOString().split('T')[0],
      open: row.open ?? row.close,
      high: row.high ?? row.close,
      low: row.low ?? row.close,
      close: row.close,
      volume: row.volume ?? 0,
    }));
}
```

#### B. On-Chain / DEX Pairs (DexScreener API)
Replaces the Python `DexScreenerAPI` for PulseChain and Uniswap pairs. For real-time quotes, `open`, `high`, `low` can default to the current price if intraday bars are not available, or pull 24h stats/OHLC from GeckoTerminal:
```typescript
// src/lib/data/dexscreener.ts
import { OHLCVPoint } from './gold';

export async function fetchDexScreenerLatestPrice(chain: string, pairAddress: string): Promise<OHLCVPoint> {
  const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DexScreener request failed: ${res.statusText}`);

  const data = await res.json();
  const pair = data.pairs?.[0];
  if (!pair) throw new Error(`No pair found on DexScreener for ${chain}/${pairAddress}`);

  const currentPrice = parseFloat(pair.priceUsd || pair.priceNative);
  const dateStr = new Date().toISOString().split('T')[0];

  return {
    date: dateStr,
    open: currentPrice,
    high: currentPrice,
    low: currentPrice,
    close: currentPrice,
    volume: pair.volume?.h24 ? parseFloat(pair.volume.h24) : 0,
  };
}
```

#### C. CoinGecko OHLC API (Historical Daily Candlestick Backfill)
CoinGecko provides a native `/coins/{id}/ohlc` endpoint returning `[timestamp, open, high, low, close]`:
```typescript
// src/lib/data/coingecko.ts
import { OHLCVPoint } from './gold';

export async function fetchCoinGeckoOHLC(coinId: string, days: number = 365): Promise<OHLCVPoint[]> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined;
  
  // CoinGecko OHLC endpoint returns array of [time, open, high, low, close]
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`CoinGecko OHLC error: ${res.statusText}`);

  const data: [number, number, number, number, number][] = await res.json();
  return data.map(([timestampMs, open, high, low, close]) => ({
    date: new Date(timestampMs).toISOString().split('T')[0],
    open,
    high,
    low,
    close,
  }));
}
```

---

## 5. CTG Indicator Calculation Engine in TypeScript

This replaces Python's `ta.momentum.ROCIndicator`, pandas resampling, and interpolation, while retaining full **OHLC** data for candlestick chart rendering.

### 5.1 Pure TypeScript CTG Engine (`src/lib/indicators/ctg.ts`)

```typescript
export interface DailyCandle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DailyPriceWithOHLC {
  date: string; // YYYY-MM-DD
  token: DailyCandle;
  gold: DailyCandle;
}

export interface CTGDataPoint {
  date: string;
  token: DailyCandle;
  gold: DailyCandle;
  ratio: number; // Token Close / Gold Close
  rocP4: number; // 4-week Rate of Change on Ratio
  signal: 'buy' | 'sell' | 'hold';
  signalValue: 1 | -1 | 0;
}

/**
 * Linearly interpolates missing gold prices for weekends / market holidays
 */
export function interpolateGoldPrices(
  data: { date: string; token: DailyCandle; gold: DailyCandle | null }[]
): DailyPriceWithOHLC[] {
  let lastKnownGold: DailyCandle = data.find((d) => d.gold !== null)?.gold ?? {
    open: 1,
    high: 1,
    low: 1,
    close: 1,
  };

  return data.map((item) => {
    if (item.gold !== null && !isNaN(item.gold.close)) {
      lastKnownGold = item.gold;
    }
    return {
      date: item.date,
      token: item.token,
      gold: lastKnownGold,
    };
  });
}

/**
 * Calculates CTG Indicator:
 * 1. Ratio = Token Close / Gold Close
 * 2. Weekly sampling (or rolling 28-day)
 * 3. 4-period ROC = ((Ratio_t - Ratio_{t-4}) / Ratio_{t-4}) * 100
 * 4. Signal crossover: Buy on cross > 0, Sell on cross < 0
 */
export function computeCTG(
  dailyPrices: DailyPriceWithOHLC[],
  options: { mode: 'weekly_interpolated' | 'rolling_daily'; windowWeeks?: number } = { mode: 'rolling_daily', windowWeeks: 4 }
): CTGDataPoint[] {
  const windowDays = (options.windowWeeks || 4) * 7; // 28 days for 4 weeks
  const results: CTGDataPoint[] = [];

  for (let i = 0; i < dailyPrices.length; i++) {
    const current = dailyPrices[i];
    const ratio = current.gold.close > 0 ? current.token.close / current.gold.close : 0;

    let rocP4 = 0;
    if (i >= windowDays) {
      const past = dailyPrices[i - windowDays];
      const pastRatio = past.gold.close > 0 ? past.token.close / past.gold.close : 0;
      rocP4 = pastRatio > 0 ? ((ratio - pastRatio) / pastRatio) * 100 : 0;
    }

    // Determine signals based on zero-line crossover
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let signalValue: 1 | -1 | 0 = 0;

    if (i > windowDays) {
      const prevRoc = results[i - 1]?.rocP4 ?? 0;
      if (rocP4 >= 0 && prevRoc < 0) {
        signal = 'buy';
        signalValue = 1;
      } else if (rocP4 < 0 && prevRoc >= 0) {
        signal = 'sell';
        signalValue = -1;
      }
    }

    results.push({
      date: current.date,
      token: current.token,
      gold: current.gold,
      ratio,
      rocP4,
      signal,
      signalValue,
    });
  }

  return results;
}
```

---

## 6. Frontend Interactive Visualizations (Lightweight Charts)

Replacing Python's static `matplotlib` script with TradingView's canvas-accelerated **Lightweight Charts**. 

With full **OHLC** data stored in the database, users can:
1. View a **Candlestick Chart** of the Cryptocurrency alongside Gold.
2. View the **Ratio & 4W ROC Oscillator** with zero-line and Buy/Sell signal markers.
3. Toggle between **Candlestick Comparison View** and **CTG Indicator View**.

```typescript
// src/components/charts/CTGChart.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, LineStyle, SeriesMarker } from 'lightweight-charts';
import { CTGDataPoint } from '@/lib/indicators/ctg';

interface Props {
  data: CTGDataPoint[];
  tokenSymbol: string;
}

export const CTGChart: React.FC<Props> = ({ data, tokenSymbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const [viewMode, setViewMode] = useState<'candlestick' | 'ratio_roc'>('candlestick');

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Clean up any previous chart instance
    if (chartInstance.current) {
      chartInstance.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#c9d1d9',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      timeScale: { borderColor: '#30363d' },
    });

    if (viewMode === 'candlestick') {
      // 1. Candlestick Series for the Token (Main Scale)
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        title: `${tokenSymbol} USD`,
      });
      candleSeries.setData(
        data.map((d) => ({
          time: d.date,
          open: d.token.open,
          high: d.token.high,
          low: d.token.low,
          close: d.token.close,
        }))
      );

      // 2. Gold Comparison Line or Candlestick (Secondary Scale on the left)
      const goldLineSeries = chart.addLineSeries({
        color: '#f0b90b',
        lineWidth: 2,
        title: 'Gold (GC=F) USD',
        priceScaleId: 'left',
      });
      chart.priceScale('left').applyOptions({
        visible: true,
        borderColor: '#30363d',
      });
      goldLineSeries.setData(
        data.map((d) => ({
          time: d.date,
          value: d.gold.close,
        }))
      );
    } else {
      // 1. Ratio Line Series (Top Pane)
      const ratioSeries = chart.addLineSeries({
        color: '#f0b90b',
        lineWidth: 2,
        title: `${tokenSymbol}/Gold Ratio`,
      });
      ratioSeries.setData(data.map((d) => ({ time: d.date, value: d.ratio })));

      // 2. ROC Oscillator Series (Separate Scale)
      const rocSeries = chart.addLineSeries({
        color: '#388bfd',
        lineWidth: 2,
        title: 'ROC (4W)',
        priceScaleId: 'rocPane',
      });
      chart.priceScale('rocPane').applyOptions({
        visible: true,
        borderColor: '#30363d',
      });
      rocSeries.setData(data.map((d) => ({ time: d.date, value: d.rocP4 })));

      // Zero-line baseline for ROC
      rocSeries.createPriceLine({
        price: 0,
        color: '#8b949e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Zero',
      });

      // 3. Buy/Sell Signal Markers
      const markers: SeriesMarker<string>[] = [];
      data.forEach((d) => {
        if (d.signal === 'buy') {
          markers.push({
            time: d.date,
            position: 'belowBar',
            color: '#2ea043',
            shape: 'arrowUp',
            text: 'BUY',
          });
        } else if (d.signal === 'sell') {
          markers.push({
            time: d.date,
            position: 'aboveBar',
            color: '#f85149',
            shape: 'arrowDown',
            text: 'SELL',
          });
        }
      });
      rocSeries.setMarkers(markers);
    }

    chart.timeScale().fitContent();
    chartInstance.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, tokenSymbol, viewMode]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* View Switcher Controls */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-gray-300">
          {viewMode === 'candlestick' ? `${tokenSymbol} vs Gold Candlestick Comparison` : `${tokenSymbol} / Gold Ratio & CTG Signals`}
        </h3>
        <div className="inline-flex rounded-lg bg-gray-900 p-1 border border-gray-800">
          <button
            onClick={() => setViewMode('candlestick')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'candlestick' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Candlestick Comparison
          </button>
          <button
            onClick={() => setViewMode('ratio_roc')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'ratio_roc' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            CTG Ratio & Signals
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden shadow-2xl border border-gray-800" />
    </div>
  );
};
```

---

## 7. Step-by-Step Conversion Roadmap

### Phase 1: Initialize Next.js Project & Tooling
1. **Initialize Project**:
   ```bash
   npx create-next-app@latest ctg-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   cd ctg-web
   ```
2. **Install Core Dependencies**:
   ```bash
   npm install @neondatabase/serverless drizzle-orm dotenv yahoo-finance2 lightweight-charts technicalindicators date-fns
   npm install -D drizzle-kit tsx @types/node
   ```
3. **Environment Setup**:
   Create `.env.local`:
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
   COINGECKO_API_KEY=your_key_here # Optional
   CRON_SECRET=your_secret_key
   ```

### Phase 2: Neon Database & ORM Setup
1. Configure `drizzle.config.ts`:
   ```typescript
   import { defineConfig } from 'drizzle-kit';
   export default defineConfig({
     schema: './src/db/schema.ts',
     out: './drizzle',
     dialect: 'postgresql',
     dbCredentials: { url: process.env.DATABASE_URL! },
   });
   ```
2. Initialize Neon client (`src/db/index.ts`):
   ```typescript
   import { neon } from '@neondatabase/serverless';
   import { drizzle } from 'drizzle-orm/neon-http';
   import * as schema from './schema';

   const sql = neon(process.env.DATABASE_URL!);
   export const db = drizzle(sql, { schema });
   ```
3. Run migrations:
   ```bash
   npx drizzle-kit push
   ```

### Phase 3: Data Migration Script (Legacy `.pkl` / `.xlsx` to Neon)
Create a migration seed script (`scripts/seed-legacy.ts`) to import historical data from the Python project into Neon:
- Parse `support/token_pairs.xlsx` and insert into `tokens` table.
- Convert `pulsechain.pkl` and `pulsex.pkl` to JSON (or use `xlsx`/Python export script) and bulk insert into `token_prices`.
- Backfill historical gold prices from `yahoo-finance2` into `gold_prices`.

### Phase 4: Automated Data Sync via Next.js Route Handlers
Create an automated sync endpoint (`src/app/api/cron/sync/route.ts`):
1. Authenticate using `CRON_SECRET`.
2. Fetch newest gold price via `yahoo-finance2` and upsert into `gold_prices`.
3. For each active token:
   - If `source_type === 'yahoo'`, fetch missing dates using `yahooFinance.historical`.
   - If `source_type === 'dexscreener'`, fetch latest price from DexScreener and insert today's entry.
4. Update `sync_history`.
5. Trigger with **Vercel Cron Jobs** or external cron (e.g. GitHub Actions / Upstash).

### Phase 5: API Endpoints & Server Actions
- `GET /api/tokens`: List all supported tokens.
- `GET /api/indicator/[symbol]?mode=rolling_daily`: Return merged token/gold prices with computed ROC and Buy/Sell signals.
- Server Action `recomputeIndicator(symbol, options)` for instant client-side updates.

### Phase 6: Modern Dashboard UI
Build an interactive dashboard:
- **Token Selector**: Switch between BTC, ETH, PLS, PLSX, HEX, etc.
- **Metric Cards**: Current Ratio, 4W ROC %, Current Signal (BUY / SELL / HOLD), Days in Current Trend.
- **Interactive Multi-Mode Chart**:
  - **Candlestick Comparison View**: Full Japanese candlesticks (`open`, `high`, `low`, `close`) for the selected crypto with Gold price overlay on a secondary scale for direct price action comparison.
  - **CTG Indicator View**: Smooth Ratio curve + 4W ROC oscillator pane with Zero-line and Buy/Sell crossover markers.
- **Data Table**: History log showing past signal crossover dates and historical performance.

### Phase 7: Testing, Optimization & Deployment
- Test data consistency against original Python output from `demonstration.ipynb`.
- Deploy Next.js to **Vercel**.
- Connect database connection pooling in Neon.
- Configure daily scheduled sync at `00:36 UTC` (mirroring the original Python trigger).
