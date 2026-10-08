import { getDb, schema } from '@/db';
import { eq, asc, desc, sql, and, gte, lte } from 'drizzle-orm';
import { SUPPORTED_TOKENS, TokenDefinition } from './tokens';
import { CTGDataService } from './service';
import { OHLCVPoint } from './gold';

export interface DatabaseAssetSummary {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodity';
  chain?: string;
  sourceType: string;
  quoteToken: string;
  startDate: string | null;
  endDate: string | null;
  totalRecords: number;
  latestPrice: number | null;
  color: string;
}

export interface AssetCandle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class AssetDataService {
  /**
   * Returns list of assets stored in the database with their respective date ranges & record counts.
   */
  static async getDatabaseAssets(): Promise<DatabaseAssetSummary[]> {
    const db = getDb();
    const result: DatabaseAssetSummary[] = [];

    // 1. Process Gold Asset
    let goldMinDate: string | null = null;
    let goldMaxDate: string | null = null;
    let goldCount = 0;
    let goldLatestPrice: number | null = null;

    if (db) {
      try {
        const [goldStats] = await db
          .select({
            minDate: sql<string>`min(date)`,
            maxDate: sql<string>`max(date)`,
            count: sql<number>`count(*)`,
          })
          .from(schema.goldPrices);

        if (goldStats && Number(goldStats.count) > 0) {
          goldMinDate = goldStats.minDate;
          goldMaxDate = goldStats.maxDate;
          goldCount = Number(goldStats.count);

          const [latestGold] = await db
            .select({ close: schema.goldPrices.close })
            .from(schema.goldPrices)
            .orderBy(desc(schema.goldPrices.date))
            .limit(1);

          if (latestGold) {
            goldLatestPrice = parseFloat(latestGold.close);
          }
        }
      } catch (err) {
        console.warn('Failed to query gold stats from database:', err);
      }
    }

    // Fallback if DB not populated yet
    if (!goldMinDate) {
      try {
        const goldHistory = await CTGDataService.getGoldHistory('2023-01-01');
        if (goldHistory.length > 0) {
          goldMinDate = goldHistory[0].date;
          goldMaxDate = goldHistory[goldHistory.length - 1].date;
          goldCount = goldHistory.length;
          goldLatestPrice = goldHistory[goldHistory.length - 1].close;
        }
      } catch (e) {
        console.warn('Gold history fallback error:', e);
      }
    }

    result.push({
      symbol: 'GOLD',
      name: 'COMEX Gold Spot (GC=F)',
      category: 'commodity',
      sourceType: 'yahoo',
      quoteToken: 'USD',
      startDate: goldMinDate,
      endDate: goldMaxDate,
      totalRecords: goldCount,
      latestPrice: goldLatestPrice,
      color: '#fbbf24',
    });

    // 2. Process Cryptocurrency Tokens
    for (const tokenDef of SUPPORTED_TOKENS) {
      let minDate: string | null = null;
      let maxDate: string | null = null;
      let count = 0;
      let latestPrice: number | null = null;

      if (db) {
        try {
          const tokenRec = await db.query.tokens.findFirst({
            where: eq(schema.tokens.symbol, tokenDef.symbol),
          });

          if (tokenRec) {
            const [stats] = await db
              .select({
                minDate: sql<string>`min(date)`,
                maxDate: sql<string>`max(date)`,
                count: sql<number>`count(*)`,
              })
              .from(schema.tokenPrices)
              .where(eq(schema.tokenPrices.tokenId, tokenRec.id));

            if (stats && Number(stats.count) > 0) {
              minDate = stats.minDate;
              maxDate = stats.maxDate;
              count = Number(stats.count);

              const [latestRec] = await db
                .select({ close: schema.tokenPrices.close })
                .from(schema.tokenPrices)
                .where(eq(schema.tokenPrices.tokenId, tokenRec.id))
                .orderBy(desc(schema.tokenPrices.date))
                .limit(1);

              if (latestRec) {
                latestPrice = parseFloat(latestRec.close);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to query token stats for ${tokenDef.symbol}:`, err);
        }
      }

      // Live/legacy fallback if database isn't fully seeded yet
      if (!minDate) {
        try {
          const history = await CTGDataService.getTokenHistory(tokenDef, '2023-01-01');
          if (history.length > 0) {
            minDate = history[0].date;
            maxDate = history[history.length - 1].date;
            count = history.length;
            latestPrice = history[history.length - 1].close;
          }
        } catch (e) {
          console.warn(`Token history fallback error for ${tokenDef.symbol}:`, e);
        }
      }

      result.push({
        symbol: tokenDef.symbol,
        name: tokenDef.name,
        category: 'crypto',
        chain: tokenDef.chain || 'layer-1',
        sourceType: tokenDef.sourceType,
        quoteToken: tokenDef.quoteToken,
        startDate: minDate,
        endDate: maxDate,
        totalRecords: count,
        latestPrice,
        color: tokenDef.color,
      });
    }

    return result;
  }

  /**
   * Retrieves OHLCV candlestick data for a specific asset within a customizable date range.
   */
  static async getAssetCandles(
    symbol: string,
    options: { startDate?: string; endDate?: string } = {}
  ): Promise<{
    symbol: string;
    name: string;
    quoteToken: string;
    candles: AssetCandle[];
    minAvailableDate: string | null;
    maxAvailableDate: string | null;
  } | null> {
    const sym = symbol.toUpperCase();
    const db = getDb();

    // 1. Gold asset
    if (sym === 'GOLD') {
      let rawPoints: OHLCVPoint[] = [];

      if (db) {
        try {
          const query = db
            .select()
            .from(schema.goldPrices)
            .orderBy(asc(schema.goldPrices.date));

          const dbGold = await query;
          if (dbGold.length > 0) {
            rawPoints = dbGold.map((g) => ({
              date: g.date,
              open: parseFloat(g.open),
              high: parseFloat(g.high),
              low: parseFloat(g.low),
              close: parseFloat(g.close),
              volume: g.volume ? parseFloat(g.volume) : 0,
            }));
          }
        } catch (e) {
          console.warn('Error fetching gold candles from DB:', e);
        }
      }

      if (rawPoints.length === 0) {
        rawPoints = await CTGDataService.getGoldHistory('2021-01-01');
      }

      const minAvailableDate = rawPoints.length > 0 ? rawPoints[0].date : null;
      const maxAvailableDate = rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].date : null;

      let filtered = rawPoints;
      if (options.startDate) {
        filtered = filtered.filter((p) => p.date >= options.startDate!);
      }
      if (options.endDate) {
        filtered = filtered.filter((p) => p.date <= options.endDate!);
      }

      return {
        symbol: 'GOLD',
        name: 'COMEX Gold Spot (GC=F)',
        quoteToken: 'USD',
        candles: filtered.map((p) => ({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume || 0,
        })),
        minAvailableDate,
        maxAvailableDate,
      };
    }

    // 2. Cryptocurrency token
    const tokenDef = SUPPORTED_TOKENS.find(
      (t) => t.symbol.toUpperCase() === sym
    );

    if (!tokenDef) {
      return null;
    }

    let rawPoints: OHLCVPoint[] = [];

    if (db) {
      try {
        const tokenRec = await db.query.tokens.findFirst({
          where: eq(schema.tokens.symbol, tokenDef.symbol),
        });

        if (tokenRec) {
          const prices = await db.query.tokenPrices.findMany({
            where: eq(schema.tokenPrices.tokenId, tokenRec.id),
            orderBy: [asc(schema.tokenPrices.date)],
          });

          if (prices.length > 0) {
            rawPoints = prices.map((p) => ({
              date: p.date,
              open: parseFloat(p.open),
              high: parseFloat(p.high),
              low: parseFloat(p.low),
              close: parseFloat(p.close),
              volume: p.volume ? parseFloat(p.volume) : 0,
            }));
          }
        }
      } catch (e) {
        console.warn(`Error fetching candles for ${tokenDef.symbol} from DB:`, e);
      }
    }

    if (rawPoints.length === 0) {
      rawPoints = await CTGDataService.getTokenHistory(tokenDef, '2021-01-01');
    }

    const minAvailableDate = rawPoints.length > 0 ? rawPoints[0].date : null;
    const maxAvailableDate = rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].date : null;

    let filtered = rawPoints;
    if (options.startDate) {
      filtered = filtered.filter((p) => p.date >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter((p) => p.date <= options.endDate!);
    }

    return {
      symbol: tokenDef.symbol,
      name: tokenDef.name,
      quoteToken: tokenDef.quoteToken,
      candles: filtered.map((p) => ({
        time: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume || 0,
      })),
      minAvailableDate,
      maxAvailableDate,
    };
  }
}
