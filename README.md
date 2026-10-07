# Crypto to Gold (CTG) Terminal

A modern, high-performance quantitative financial terminal and momentum indicator built with **Next.js 16 (App Router)**, **TypeScript 5**, **Neon Serverless PostgreSQL (Drizzle ORM)**, and **TradingView Lightweight Charts v5**.

Inspired by Michael Silva's *"Saylor to Schiff"* indicator, this terminal evaluates the purchasing power and momentum of cryptocurrencies denominated in Gold (`GC=F`) rather than fiat USD.

---

## Features

- **Multi-Asset Support**:
  - Major Cryptos: **Bitcoin (BTC)**, **Ethereum (ETH)**, **Solana (SOL)** via Yahoo Finance.
  - On-Chain DEX Pairs: **PulseChain (PLS)**, **PulseX (PLSX)** via DexScreener API with legacy historical backfill.
  - Gold Benchmarks: COMEX Gold Futures (`GC=F`) with automatic linear interpolation for weekend and holiday gaps.
- **Dual Calculation Engines**:
  - **Rolling 28-Day Daily Window**: Eliminates mid-week projection distortion and avoids historical revisions.
  - **Classic Weekly Interpolated**: Exact reproduction of the original Python pandas resampling algorithm (`W-SUN` resample, 4-period ROC, and linear interpolation).
- **Zero-Line Crossover Signals**:
  - **BUY (+1)**: ROC crosses above zero ($\ge 0$). Crypto momentum gaining over gold.
  - **SELL (-1)**: ROC crosses below zero ($< 0$). Gold gaining relative momentum.
  - **HOLD (0)**: Trend continuation.
- **Interactive TradingView Visualizations**:
  - Canvas-accelerated dual-pane oscillator with ratio curve, zero dashed line, and BUY/SELL arrow markers.
  - Full candlestick comparison overlay view with gold secondary scale.
  - Real-time crosshair inspector HUD.
- **Serverless PostgreSQL & Direct Provider Fallback**:
  - Drizzle ORM schema with Neon Serverless Postgres integration.
  - Dynamic fallback to live providers (Yahoo Finance & DexScreener) if `DATABASE_URL` is not yet configured.
- **Automated Synchronization**:
  - Route handler `/api/cron/sync` for automated daily triggers at `00:36 UTC` (Vercel Cron / GitHub Actions).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (Optional for Neon DB)
Copy `.env.example` to `.env.local`:
```env
DATABASE_URL=postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
COINGECKO_API_KEY=
CRON_SECRET=ctg_sync_secret_token_123
```
*Note: If `DATABASE_URL` is omitted, the application runs in direct real-time provider mode using Yahoo Finance and DexScreener.*

### 3. Database Migrations & Seeding (When Neon is connected)
```bash
# Push schema to Neon
npm run db:push

# Seed legacy data and backfill historical prices
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the terminal.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## API Endpoints

- `GET /api/tokens` - List supported assets and database connectivity state.
- `GET /api/indicator/[symbol]?mode=rolling_daily` - Indicator calculations, ratio curves, ROC series, and summary metrics.
- `POST /api/cron/sync` - Synchronize newest price bars into Neon PostgreSQL.
