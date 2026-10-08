import { OHLCVPoint } from './gold';

export interface DexPairInfo {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  volume?: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange?: {
    h24: number;
  };
  liquidity?: {
    usd: number;
  };
}

export async function fetchDexScreenerPair(
  chain: string,
  pairAddress: string
): Promise<DexPairInfo | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`DexScreener request failed for ${chain}/${pairAddress}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const pair = data.pairs?.[0];
    return pair || null;
  } catch (error) {
    console.error(`Error querying DexScreener pair ${chain}/${pairAddress}:`, error);
    return null;
  }
}

export async function fetchDexScreenerTokens(tokenAddress: string): Promise<DexPairInfo | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Pick pair with highest USD liquidity
    const sorted = [...data.pairs].sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );
    return sorted[0];
  } catch (error) {
    console.error(`Error querying DexScreener token ${tokenAddress}:`, error);
    return null;
  }
}

export async function fetchDexScreenerLatestPrice(
  chain: string,
  pairAddress: string
): Promise<OHLCVPoint | null> {
  let pair = await fetchDexScreenerPair(chain, pairAddress);
  if (!pair) {
    pair = await fetchDexScreenerTokens(pairAddress);
  }
  if (!pair) return null;

  const currentPrice = parseFloat(pair.priceUsd || pair.priceNative);
  if (isNaN(currentPrice) || currentPrice <= 0) return null;

  const dateStr = new Date().toISOString().split('T')[0];

  return {
    date: dateStr,
    open: currentPrice,
    high: currentPrice,
    low: currentPrice,
    close: currentPrice,
    volume: pair.volume?.h24 ? Number(pair.volume.h24) : 0,
  };
}
