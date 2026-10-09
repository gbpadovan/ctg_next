import fs from 'fs';
import path from 'path';
import { getDb, schema } from '@/db';
import { eq, asc, desc, sql } from 'drizzle-orm';
import { fetchGoldHistorical, fetchGoldLatest, OHLCVPoint } from './gold';
import { fetchYahooCryptoHistorical, fetchYahooCryptoLatest } from './crypto-yahoo';
import { fetchDexScreenerLatestPrice } from './dexscreener';
import { SUPPORTED_TOKENS, TokenDefinition, ASSET_PROVIDER_MAPPINGS } from './tokens';
import {
  computeCTG,
  interpolateGoldPrices,
  CTGAnalysisResult,
  DailyCandle,
} from '../indicators/ctg';

// In-memory cache for fast repeated queries
const memoryCache = new Map<string, { timestamp: number; data: CTGAnalysisResult }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export class CTGDataService {
  /**
   * Returns list of supported tokens
   */
  static getSupportedTokens(): TokenDefinition[] {
    return SUPPORTED_TOKENS;
  }

  /**
   * Fetches token prices from database or live providers
   */
  static async getTokenHistory(
    token: TokenDefinition,
    startDate: string = '2023-01-01'
  ): Promise<OHLCVPoint[]> {
    const db = getDb();

    if (db) {
      try {
        const tokenRecord = await db.query.tokens.findFirst({
          where: eq(schema.tokens.symbol, token.symbol),
        });

        if (tokenRecord) {
          const prices = await db.query.tokenPrices.findMany({
            where: eq(schema.tokenPrices.tokenId, tokenRecord.id),
            orderBy: [asc(schema.tokenPrices.date)],
          });

          if (prices.length > 0) {
            return prices.map((p) => ({
              date: p.date,
              open: parseFloat(p.open),
              high: parseFloat(p.high),
              low: parseFloat(p.low),
              close: parseFloat(p.close),
              volume: p.volume ? parseFloat(p.volume) : 0,
            }));
          }
        }
      } catch (err) {
        console.warn(`Database query failed for ${token.symbol}, falling back to live/legacy source:`, err);
      }
    }

    // Direct Live/Legacy Provider Fallback
    if (token.sourceType === 'yahoo') {
      return await fetchYahooCryptoHistorical(token.symbol, startDate);
    }

    if (token.sourceType === 'dexscreener') {
      // Load historical baseline from legacy JSON file if available
      const legacyPoints: OHLCVPoint[] = [];
      const legacyFileName =
        token.symbol.toLowerCase() === 'pls'
          ? 'pulsechain.json'
          : token.symbol.toLowerCase() === 'plsx'
          ? 'pulsex.json'
          : null;

      if (legacyFileName) {
        try {
          const legacyPath = path.join(process.cwd(), 'legacy_data', legacyFileName);
          if (fs.existsSync(legacyPath)) {
            const raw = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
            for (const item of raw) {
              const close = parseFloat(item.close);
              legacyPoints.push({
                date: item.date,
                open: close,
                high: close,
                low: close,
                close: close,
                volume: item.volume ? parseFloat(item.volume) : 0,
              });
            }
          }
        } catch (e) {
          console.warn(`Error reading legacy file ${legacyFileName}:`, e);
        }
      }

      // Fetch latest price from DexScreener
      if (token.chain && token.sourceIdentifier) {
        try {
          const latest = await fetchDexScreenerLatestPrice(token.chain, token.sourceIdentifier);
          if (latest) {
            const lastExisting = legacyPoints[legacyPoints.length - 1];
            if (!lastExisting || lastExisting.date !== latest.date) {
              legacyPoints.push(latest);
            } else {
              legacyPoints[legacyPoints.length - 1] = latest;
            }
          }
        } catch (e) {
          console.warn(`Error fetching latest DexScreener price for ${token.symbol}:`, e);
        }
      }

      return legacyPoints;
    }

    return [];
  }

  /**
   * Fetches Gold historical OHLCV data
   */
  static async getGoldHistory(startDate: string = '2023-01-01'): Promise<OHLCVPoint[]> {
    const db = getDb();

    if (db) {
      try {
        const prices = await db.query.goldPrices.findMany({
          orderBy: [asc(schema.goldPrices.date)],
        });

        if (prices.length > 0) {
          return prices.map((p) => ({
            date: p.date,
            open: parseFloat(p.open),
            high: parseFloat(p.high),
            low: parseFloat(p.low),
            close: parseFloat(p.close),
            volume: p.volume ? parseFloat(p.volume) : 0,
          }));
        }
      } catch (err) {
        console.warn('Database query failed for Gold prices, falling back to Yahoo Finance:', err);
      }
    }

    return await fetchGoldHistorical(startDate);
  }

  /**
   * Main calculation engine: merges Token and Gold prices, interpolates missing weekend gold bars,
   * and calculates the CTG ratio and ROC signals.
   */
  static async getCTGAnalysis(
    symbol: string,
    options: {
      mode?: 'rolling_daily' | 'weekly_interpolated';
      startDate?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<CTGAnalysisResult | null> {
    const mode = options.mode || 'rolling_daily';
    const cacheKey = `${symbol.toUpperCase()}_${mode}`;

    if (!options.forceRefresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const tokenDef = SUPPORTED_TOKENS.find(
      (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
    );

    if (!tokenDef) {
      return null;
    }

    const startDate = options.startDate || '2023-01-01';

    // Parallel fetch of Token and Gold
    const [tokenHistory, goldHistory] = await Promise.all([
      this.getTokenHistory(tokenDef, startDate),
      this.getGoldHistory(startDate),
    ]);

    if (tokenHistory.length === 0) {
      return null;
    }

    // Build map of Gold prices keyed by date
    const goldMap = new Map<string, DailyCandle>();
    for (const g of goldHistory) {
      goldMap.set(g.date, {
        open: g.open,
        high: g.high,
        low: g.low,
        close: g.close,
        volume: g.volume,
      });
    }

    // Pair each token date with corresponding gold price (or null)
    const combinedData = tokenHistory.map((t) => ({
      date: t.date,
      token: {
        open: t.open,
        high: t.high,
        low: t.low,
        close: t.close,
        volume: t.volume,
      },
      gold: goldMap.get(t.date) || null,
    }));

    // Linearly interpolate Gold prices for weekend / holiday crypto days
    const alignedPrices = interpolateGoldPrices(combinedData);

    // Compute CTG indicator and signals
    const result = computeCTG(alignedPrices, {
      mode,
      windowWeeks: 4,
      symbol: tokenDef.symbol,
    });

    memoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  }

  /**
   * Syncs latest quotes into Neon Database when connected
   */
  static async syncAllToDatabase(): Promise<{ success: boolean; message: string; details: Record<string, number> }> {
    const db = getDb();
    if (!db) {
      return {
        success: false,
        message: 'DATABASE_URL is not configured. Running in dynamic direct-provider mode.',
        details: {},
      };
    }

    const details: Record<string, number> = {};

    // 1. Sync Gold in parallel bulk batches
    try {
      const goldPoints = await fetchGoldHistorical('2023-01-01');
      const BATCH_SIZE = 250;
      const batches: OHLCVPoint[][] = [];
      for (let i = 0; i < goldPoints.length; i += BATCH_SIZE) {
        batches.push(goldPoints.slice(i, i + BATCH_SIZE));
      }

      await Promise.all(
        batches.map((batch) =>
          db
            .insert(schema.goldPrices)
            .values(
              batch.map((pt) => ({
                date: pt.date,
                open: pt.open.toString(),
                high: pt.high.toString(),
                low: pt.low.toString(),
                close: pt.close.toString(),
                volume: pt.volume ? pt.volume.toString() : '0',
              }))
            )
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

      details['GOLD'] = goldPoints.length;
    } catch (err) {
      console.error('Error syncing gold:', err);
    }

    // 2. Sync Each Token in parallel bulk batches
    for (const token of SUPPORTED_TOKENS) {
      try {
        // Ensure token exists in tokens table
        const existing = await db.query.tokens.findFirst({
          where: eq(schema.tokens.symbol, token.symbol),
        });

        let tokenId: number;
        if (!existing) {
          const inserted = await db
            .insert(schema.tokens)
            .values({
              symbol: token.symbol,
              name: token.name,
              sourceType: token.sourceType,
              sourceIdentifier: token.sourceIdentifier,
              chain: token.chain,
              quoteToken: token.quoteToken,
            })
            .returning({ id: schema.tokens.id });
          tokenId = inserted[0].id;
        } else {
          tokenId = existing.id;
        }

        const prices = await this.getTokenHistory(token, '2023-01-01');
        const BATCH_SIZE = 250;
        const batches: OHLCVPoint[][] = [];
        for (let i = 0; i < prices.length; i += BATCH_SIZE) {
          batches.push(prices.slice(i, i + BATCH_SIZE));
        }

        await Promise.all(
          batches.map((batch) =>
            db
              .insert(schema.tokenPrices)
              .values(
                batch.map((pt) => ({
                  tokenId,
                  date: pt.date,
                  open: pt.open.toString(),
                  high: pt.high.toString(),
                  low: pt.low.toString(),
                  close: pt.close.toString(),
                  volume: pt.volume ? pt.volume.toString() : '0',
                }))
              )
              .onConflictDoUpdate({
                target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
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

        details[token.symbol] = prices.length;
      } catch (err) {
        console.error(`Error syncing token ${token.symbol}:`, err);
      }
    }

    return {
      success: true,
      message: 'Synchronization completed successfully.',
      details,
    };
  }

  /**
   * Retrieves the latest price for both the token and gold from Yahoo Finance,
   * stores them in the database, and recalculates the CTG analysis.
   */
  static async refreshLatestPairFromYahoo(
    symbol: string,
    mode: 'rolling_daily' | 'weekly_interpolated' = 'rolling_daily'
  ): Promise<{
    success: boolean;
    message: string;
    data?: CTGAnalysisResult;
    tokenPrice?: number;
    goldPrice?: number;
    date?: string;
  }> {
    const sym = symbol.toUpperCase().trim();
    const db = getDb();

    if (!db) {
      return {
        success: false,
        message: 'Database is not connected. Please verify DATABASE_URL.',
      };
    }

    const tokenDef = SUPPORTED_TOKENS.find(
      (t) => t.symbol.toUpperCase() === sym
    );

    if (!tokenDef) {
      return {
        success: false,
        message: `Asset "${sym}" is not recognized as a supported token.`,
      };
    }

    const yahooTicker = ASSET_PROVIDER_MAPPINGS[sym]?.yahoo || `${sym}-USD`;

    try {
      // 1. Fetch latest prices in parallel from Yahoo Finance
      const [goldPoint, tokenPoint] = await Promise.all([
        fetchGoldLatest(),
        fetchYahooCryptoLatest(yahooTicker),
      ]);

      if (!goldPoint || isNaN(goldPoint.close) || goldPoint.close <= 0) {
        return {
          success: false,
          message: 'Failed to retrieve latest Gold price from Yahoo Finance (GC=F).',
        };
      }

      if (!tokenPoint || isNaN(tokenPoint.close) || tokenPoint.close <= 0) {
        return {
          success: false,
          message: `Failed to retrieve latest ${sym} price from Yahoo Finance (${yahooTicker}).`,
        };
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const goldDate = goldPoint.date || todayStr;
      const tokenDate = tokenPoint.date || todayStr;

      // 2. Upsert latest Gold price into gold_prices
      await db
        .insert(schema.goldPrices)
        .values({
          date: goldDate,
          open: goldPoint.open.toString(),
          high: goldPoint.high.toString(),
          low: goldPoint.low.toString(),
          close: goldPoint.close.toString(),
          volume: (goldPoint.volume || 0).toString(),
        })
        .onConflictDoUpdate({
          target: schema.goldPrices.date,
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            volume: sql`excluded.volume`,
          },
        });

      // 3. Upsert latest Token price into token_prices
      let tokenRecord = await db.query.tokens.findFirst({
        where: eq(schema.tokens.symbol, sym),
      });

      if (!tokenRecord) {
        const [inserted] = await db
          .insert(schema.tokens)
          .values({
            symbol: sym,
            name: tokenDef.name,
            sourceType: tokenDef.sourceType,
            sourceIdentifier: tokenDef.sourceIdentifier,
            chain: tokenDef.chain || 'layer-1',
            quoteToken: tokenDef.quoteToken || 'USD',
          })
          .returning();
        tokenRecord = inserted;
      }

      const tokenId = tokenRecord.id;

      await db
        .insert(schema.tokenPrices)
        .values({
          tokenId,
          date: tokenDate,
          open: tokenPoint.open.toString(),
          high: tokenPoint.high.toString(),
          low: tokenPoint.low.toString(),
          close: tokenPoint.close.toString(),
          volume: (tokenPoint.volume || 0).toString(),
        })
        .onConflictDoUpdate({
          target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            volume: sql`excluded.volume`,
          },
        });

      // 4. Update sync history for both
      await Promise.all([
        db
          .insert(schema.syncHistory)
          .values({ target: 'GOLD', lastDateSynced: goldDate })
          .onConflictDoNothing(),
        db
          .insert(schema.syncHistory)
          .values({ target: sym, lastDateSynced: tokenDate })
          .onConflictDoNothing(),
      ]);

      // 5. Invalidate memory cache and recompute CTG analysis
      memoryCache.delete(`${sym}_rolling_daily`);
      memoryCache.delete(`${sym}_weekly_interpolated`);

      const updatedAnalysis = await this.getCTGAnalysis(sym, {
        mode,
        forceRefresh: true,
      });

      if (!updatedAnalysis) {
        return {
          success: false,
          message: 'Prices updated in database, but failed to recalculate CTG indicator.',
        };
      }

      const ratio = tokenPoint.close / goldPoint.close;

      return {
        success: true,
        message: `Updated Yahoo prices: ${sym} ($${tokenPoint.close.toLocaleString('en-US', { maximumFractionDigits: 4 })}) & Gold ($${goldPoint.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) on ${tokenDate}. New Ratio: ${ratio.toFixed(6)}.`,
        data: updatedAnalysis,
        tokenPrice: tokenPoint.close,
        goldPrice: goldPoint.close,
        date: tokenDate,
      };
    } catch (err: unknown) {
      console.error(`Error refreshing latest prices for ${sym}:`, err);
      return {
        success: false,
        message: `Failed to refresh prices: ${(err as Error).message}`,
      };
    }
  }
}
