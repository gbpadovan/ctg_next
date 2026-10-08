import { OHLCVPoint } from './gold';

export async function fetchCoinGeckoOHLC(
  coinId: string,
  days: number = 365
): Promise<OHLCVPoint[]> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`CoinGecko OHLC error for ${coinId}: ${res.statusText}`);
      return [];
    }

    const data: [number, number, number, number, number][] = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(([timestampMs, open, high, low, close]) => ({
      date: new Date(timestampMs).toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: 0,
    }));
  } catch (error) {
    console.error(`Error in fetchCoinGeckoOHLC for ${coinId}:`, error);
    return [];
  }
}

export async function fetchCoinGeckoRange(
  coinId: string,
  startDate?: string,
  endDate?: string
): Promise<OHLCVPoint[]> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const now = Math.floor(Date.now() / 1000);
    const fromSec = startDate
      ? Math.floor(new Date(startDate).getTime() / 1000)
      : now - 365 * 24 * 3600;
    const toSec = endDate
      ? Math.floor(new Date(endDate).getTime() / 1000) + 86400
      : now;

    // Use market_chart/range for custom date ranges
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`CoinGecko range error for ${coinId}: ${res.statusText}`);
      // Fallback to OHLC
      return fetchCoinGeckoOHLC(coinId, 365);
    }

    const data = await res.json();
    if (!data?.prices || !Array.isArray(data.prices)) {
      return [];
    }

    // Group hourly points into daily candles
    const dailyMap = new Map<
      string,
      { open: number; high: number; low: number; close: number; volume: number }
    >();

    const volumesMap = new Map<string, number>();
    if (Array.isArray(data.total_volumes)) {
      for (const [timestampMs, vol] of data.total_volumes) {
        const d = new Date(timestampMs).toISOString().split('T')[0];
        volumesMap.set(d, vol);
      }
    }

    for (const [timestampMs, price] of data.prices) {
      const dateStr = new Date(timestampMs).toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr);
      if (!existing) {
        dailyMap.set(dateStr, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volumesMap.get(dateStr) || 0,
        });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, bar]) => ({
        date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`Error in fetchCoinGeckoRange for ${coinId}:`, error);
    return [];
  }
}
