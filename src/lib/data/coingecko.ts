import { OHLCVPoint } from './gold';

export async function fetchCoinGeckoOHLC(coinId: string, days: number = 365): Promise<OHLCVPoint[]> {
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
    }));
  } catch (error) {
    console.error(`Error in fetchCoinGeckoOHLC for ${coinId}:`, error);
    return [];
  }
}
