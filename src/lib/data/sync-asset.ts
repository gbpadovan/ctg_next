import { getDb, schema } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { OHLCVPoint, fetchGoldHistorical } from './gold';
import { fetchYahooCryptoHistorical } from './crypto-yahoo';
import { fetchCoinGeckoRange } from './coingecko';
import { fetchDexScreenerLatestPrice } from './dexscreener';
import { SUPPORTED_TOKENS } from './tokens';

export interface SyncAssetParams {
  symbol: string;
  provider: 'yahoo' | 'coingecko' | 'dexscreener';
  identifier: string;
  chain?: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncAssetResult {
  success: boolean;
  message: string;
  count?: number;
  startDate?: string;
  endDate?: string;
  latestPrice?: number;
}

export async function syncAssetFromProvider(params: SyncAssetParams): Promise<SyncAssetResult> {
  const { symbol, provider, identifier, chain, startDate, endDate } = params;
  const sym = symbol.toUpperCase();
  const db = getDb();

  if (!db) {
    return {
      success: false,
      message: 'Database is not connected. Please verify DATABASE_URL configuration.',
    };
  }

  const effectiveStart = startDate || '2023-01-01';
  const effectiveEnd = endDate || new Date().toISOString().slice(0, 10);

  let candles: OHLCVPoint[] = [];

  try {
    if (provider === 'yahoo') {
      let ticker = identifier.trim().toUpperCase();
      if (ticker === 'GF=C') {
        ticker = 'GC=F';
      }
      if (sym === 'GOLD' || ticker === 'GC=F') {
        candles = await fetchGoldHistorical(effectiveStart, effectiveEnd, ticker);
      } else {
        candles = await fetchYahooCryptoHistorical(ticker, effectiveStart, effectiveEnd);
      }
    } else if (provider === 'coingecko') {
      const coinId = identifier.trim().toLowerCase();
      candles = await fetchCoinGeckoRange(coinId, effectiveStart, effectiveEnd);
    } else if (provider === 'dexscreener') {
      const pairOrToken = identifier.trim();
      const effChain = chain || 'pulsechain';
      const latestPoint = await fetchDexScreenerLatestPrice(effChain, pairOrToken);
      if (latestPoint) {
        candles = [latestPoint];
      }
    }
  } catch (err: unknown) {
    console.error(`Error fetching data from ${provider} for ${symbol}:`, err);
    return {
      success: false,
      message: `Failed to fetch from ${provider}: ${(err as Error).message}`,
    };
  }

  if (candles.length === 0) {
    return {
      success: false,
      message: `No candles returned from ${provider} for identifier "${identifier}" between ${effectiveStart} and ${effectiveEnd}.`,
    };
  }

  // Filter out any invalid items
  const validCandles = candles.filter(
    (c) => c.date && !isNaN(c.close) && c.close > 0
  );

  if (validCandles.length === 0) {
    return {
      success: false,
      message: 'Returned data had invalid prices or dates.',
    };
  }

  try {
    const BATCH_SIZE = 250;

    if (sym === 'GOLD') {
      // Chunk inserts in true bulk batches (single SQL query per batch, executed in parallel)
      const batches: OHLCVPoint[][] = [];
      for (let i = 0; i < validCandles.length; i += BATCH_SIZE) {
        batches.push(validCandles.slice(i, i + BATCH_SIZE));
      }

      await Promise.all(
        batches.map((batch) =>
          db
            .insert(schema.goldPrices)
            .values(
              batch.map((g) => ({
                date: g.date,
                open: g.open.toString(),
                high: g.high.toString(),
                low: g.low.toString(),
                close: g.close.toString(),
                volume: (g.volume || 0).toString(),
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

      const lastDate = validCandles[validCandles.length - 1].date;
      await db
        .insert(schema.syncHistory)
        .values({
          target: 'GOLD',
          lastDateSynced: lastDate,
        })
        .onConflictDoNothing();
    } else {
      // Crypto token upsert
      let tokenRec = await db.query.tokens.findFirst({
        where: eq(schema.tokens.symbol, sym),
      });

      if (!tokenRec) {
        const tokenDef = SUPPORTED_TOKENS.find((t) => t.symbol.toUpperCase() === sym);
        const [inserted] = await db
          .insert(schema.tokens)
          .values({
            symbol: sym,
            name: tokenDef?.name || sym,
            sourceType: provider,
            sourceIdentifier: identifier,
            chain: chain || tokenDef?.chain || 'layer-1',
            quoteToken: tokenDef?.quoteToken || 'USD',
          })
          .returning();
        tokenRec = inserted;
      }

      const tokenId = tokenRec.id;

      // Upsert candles into token_prices in parallel multi-row bulk batches
      const batches: OHLCVPoint[][] = [];
      for (let i = 0; i < validCandles.length; i += BATCH_SIZE) {
        batches.push(validCandles.slice(i, i + BATCH_SIZE));
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
                volume: (pt.volume || 0).toString(),
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

      const lastDate = validCandles[validCandles.length - 1].date;
      await db
        .insert(schema.syncHistory)
        .values({
          target: sym,
          lastDateSynced: lastDate,
        })
        .onConflictDoNothing();
    }

    const latestPrice = validCandles[validCandles.length - 1].close;

    return {
      success: true,
      message: `Successfully synchronized ${validCandles.length} candles for ${sym} from ${provider.toUpperCase()} into Neon database.`,
      count: validCandles.length,
      startDate: validCandles[0].date,
      endDate: validCandles[validCandles.length - 1].date,
      latestPrice,
    };
  } catch (err: unknown) {
    console.error(`Database error upserting candles for ${sym}:`, err);
    return {
      success: false,
      message: `Database error while storing candles: ${(err as Error).message}`,
    };
  }
}
