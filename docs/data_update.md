# Historical Asset Data Update Engine

This document details the architecture, behavior, and performance optimizations of the **Asset Data Update Engine** in `ctg_next`.

---

## 1. Update Behavior: Does it Overwrite Previous Data?

**No, it does NOT wipe or delete previous historical data.** 

The synchronization engine performs a non-destructive **UPSERT (Update or Insert)** on a per-day basis using PostgreSQL's native `ON CONFLICT DO UPDATE` clause.

### How Each Record is Handled:

1. **Dates outside the selected update range (Older History)**
   * **Untouched and Preserved:** If the database already holds candle records from `2021-01-01` to `2026-10-01`, and you run an update for `2026-10-01` to `2026-10-08`, all older records from 2021 through September 2026 remain completely intact.
2. **Dates inside the selected update range that already exist in the database**
   * **Overwritten (Refreshed):** If a day (such as `2026-10-07`) is already recorded, the database updates its `open`, `high`, `low`, `close`, and `volume` fields with the newest numbers from the provider.
   * **Why this is beneficial:** Financial markets and exchanges often revise intra-day closes, unfinalized candles, or volume totals after market close. Overwriting overlapping days ensures that the most recent bars always reflect accurate, finalized numbers.
3. **New Dates**
   * **Inserted:** Any new dates not yet in the database are seamlessly added as new rows.

### Database Unique Constraints:
* **Gold Prices (`gold_prices` table):**
  * Target: `date` (Unique primary key / date constraint).
* **Token Prices (`token_prices` table):**
  * Target: `(token_id, date)` (Composite unique constraint ensuring each token has at most one candle per calendar day).

---

## 2. Performance Architecture: Parallel Multi-Row Bulk Batching

### The Problem (Row-by-Row Sequential Queries)
When fetching historical data, a provider (such as Yahoo Finance) returns 900–1,400 daily bars in a single HTTP request (~350ms). 

However, if each candle is written to the database using an individual sequential query (`for (const candle of candles) { await db.insert(...) }`):
* Neon PostgreSQL is a serverless cloud database with network latency (~80–120ms per roundtrip).
* 950 individual database queries resulted in **950 sequential roundtrips**, taking **over 2 minutes (120–140 seconds)** to complete.

### The Solution (Parallel Multi-Row Bulk Upsert)
The engine chunks incoming candles into batches of **250 rows** and executes multi-row SQL statements:

```sql
INSERT INTO gold_prices (date, open, high, low, close, volume)
VALUES 
  ('2026-10-05', 4000.1, 4050.2, 3990.0, 4040.5, 12000),
  ('2026-10-06', 4040.5, 4080.0, 4030.0, 4075.0, 15000),
  ... [up to 250 rows in a single query]
ON CONFLICT (date) DO UPDATE SET
  open = excluded.open,
  high = excluded.high,
  low = excluded.low,
  close = excluded.close,
  volume = excluded.volume;
```

Furthermore, all batches are dispatched concurrently using `Promise.all`:

```typescript
const BATCH_SIZE = 250;
const batches: OHLCVPoint[][] = [];
for (let i = 0; i < validCandles.length; i += BATCH_SIZE) {
  batches.push(validCandles.slice(i, i + BATCH_SIZE));
}

await Promise.all(
  batches.map((batch) =>
    db
      .insert(schema.goldPrices)
      .values(batch.map((g) => ({ date: g.date, ... })))
      .onConflictDoUpdate({
        target: schema.goldPrices.date,
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          volume: sql`excluded.volume`,
        },
      })
  )
);
```

### Benchmark Results (947 Candles):
| Method | Database Roundtrips | Execution Time |
| :--- | :--- | :--- |
| **Row-by-Row (Legacy)** | 947 sequential roundtrips | ~120,000ms – 140,000ms |
| **Parallel Bulk Batching** | 4 concurrent bulk queries | **~1,000ms (1.0 second)** |
| **Performance Gain** | **~99.6% reduction in queries** | **~120x faster** ⚡ |

---

## 3. Data Providers & Identifier Formats

| Provider | Description | Identifier Format | Examples |
| :--- | :--- | :--- | :--- |
| **Yahoo Finance** | Global quotes, futures, and major cryptos | Standard Ticker symbols | `GC=F` (Gold Futures), `BTC-USD`, `ETH-USD`, `SOL-USD`, `PLS-USD`, `PLSX-USD`, `HEX-USD` |
| **CoinGecko** | Public CoinGecko range API | Coin identifier / slug | `bitcoin`, `ethereum`, `solana`, `pulsechain`, `pulsex`, `hex`, `pax-gold` |
| **DexScreener** | Decentralized exchange liquidity pools | Pair Smart Contract Address + Chain | `0xE56043671df55dE5CDf8459710433C10324DE0aE` (PLS on `pulsechain`) |

### Auto-Correction & Aliases:
* If a user types `GF=C` (common typo for Gold Futures `GC=F`), the system automatically normalizes it to **`GC=F`**.
* Special tickers containing `=`, `-`, or `^` are protected against duplicate quote suffix appending.

---

## 4. Date Format Standards

* **Database & API Standard:** Strictly uses **`YYYY-MM-DD`** (ISO 8601, e.g., `2026-10-08`).
* **Input Presentation:** The application uses a custom `IsoDateInput` component:
  * Guarantees that the input box explicitly displays dates in `YYYY-MM-DD` order regardless of browser language or operating system locale.
  * Provides a native calendar picker button (`📅`) allowing visual date selection while retaining `YYYY-MM-DD` text entry.
