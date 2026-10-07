import fs from 'fs';
import path from 'path';
import { getDb, schema } from '@/db';
import { eq, asc, desc } from 'drizzle-orm';
import { fetchGoldHistorical, OHLCVPoint } from './gold';
import { fetchYahooCryptoHistorical } from './crypto-yahoo';
import { fetchDexScreenerLatestPrice } from './dexscreener';
import { SUPPORTED_TOKENS, TokenDefinition } from './tokens';
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

    // 1. Sync Gold
    try {
      const goldPoints = await fetchGoldHistorical('2023-01-01');
      let goldInserted = 0;

      for (const pt of goldPoints) {
        await db
          .insert(schema.goldPrices)
          .values({
            date: pt.date,
            open: pt.open.toString(),
            high: pt.high.toString(),
            low: pt.low.toString(),
            close: pt.close.toString(),
            volume: pt.volume ? pt.volume.toString() : '0',
          })
          .onConflictDoUpdate({
            target: schema.goldPrices.date,
            set: {
              open: pt.open.toString(),
              high: pt.high.toString(),
              low: pt.low.toString(),
              close: pt.close.toString(),
              volume: pt.volume ? pt.volume.toString() : '0',
            },
          });
        goldInserted++;
      }
      details['GOLD'] = goldInserted;
    } catch (err) {
      console.error('Error syncing gold:', err);
    }

    // 2. Sync Each Token
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
        let count = 0;

        for (const pt of prices) {
          await db
            .insert(schema.tokenPrices)
            .values({
              tokenId,
              date: pt.date,
              open: pt.open.toString(),
              high: pt.high.toString(),
              low: pt.low.toString(),
              close: pt.close.toString(),
              volume: pt.volume ? pt.volume.toString() : '0',
            })
            .onConflictDoUpdate({
              target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
              set: {
                open: pt.open.toString(),
                high: pt.high.toString(),
                low: pt.low.toString(),
                close: pt.close.toString(),
                volume: pt.volume ? pt.volume.toString() : '0',
              },
            });
          count++;
        }
        details[token.symbol] = count;
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
}
