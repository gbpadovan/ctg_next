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
      const ticker = identifier.trim();
      if (sym === 'GOLD' || ticker === 'GC=F') {
        candles = await fetchGoldHistorical(effectiveStart, effectiveEnd);
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
    if (sym === 'GOLD') {
      // Chunk inserts in batches of 100 for high performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < validCandles.length; i += BATCH_SIZE) {
        const batch = validCandles.slice(i, i + BATCH_SIZE);
        for (const g of batch) {
          await db
            .insert(schema.goldPrices)
            .values({
              date: g.date,
              open: g.open.toString(),
              high: g.high.toString(),
              low: g.low.toString(),
              close: g.close.toString(),
              volume: (g.volume || 0).toString(),
            })
            .onConflictDoUpdate({
              target: schema.goldPrices.date,
              set: {
                open: g.open.toString(),
                high: g.high.toString(),
                low: g.low.toString(),
                close: g.close.toString(),
                volume: (g.volume || 0).toString(),
              },
            });
        }
      }

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

      // Upsert candles into token_prices
      const BATCH_SIZE = 100;
      for (let i = 0; i < validCandles.length; i += BATCH_SIZE) {
        const batch = validCandles.slice(i, i + BATCH_SIZE);
        for (const pt of batch) {
          await db
            .insert(schema.tokenPrices)
            .values({
              tokenId,
              date: pt.date,
              open: pt.open.toString(),
              high: pt.high.toString(),
              low: pt.low.toString(),
              close: pt.close.toString(),
              volume: (pt.volume || 0).toString(),
            })
            .onConflictDoUpdate({
              target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
              set: {
                open: pt.open.toString(),
                high: pt.high.toString(),
                low: pt.low.toString(),
                close: pt.close.toString(),
                volume: (pt.volume || 0).toString(),
              },
            });
        }
      }

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
