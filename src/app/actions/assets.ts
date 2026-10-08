'use server';

import { AssetDataService, DatabaseAssetSummary, AssetCandle } from '@/lib/data/assets';

export async function fetchDatabaseAssetsAction(): Promise<{
  success: boolean;
  data?: DatabaseAssetSummary[];
  error?: string;
}> {
  try {
    const assets = await AssetDataService.getDatabaseAssets();
    return { success: true, data: assets };
  } catch (err: unknown) {
    console.error('Failed to fetch database assets:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function fetchAssetCandlesAction(
  symbol: string,
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data?: {
    symbol: string;
    name: string;
    quoteToken: string;
    candles: AssetCandle[];
    minAvailableDate: string | null;
    maxAvailableDate: string | null;
  };
  error?: string;
}> {
  try {
    const result = await AssetDataService.getAssetCandles(symbol, {
      startDate,
      endDate,
    });

    if (!result) {
      return { success: false, error: `Asset ${symbol} not found.` };
    }

    return { success: true, data: result };
  } catch (err: unknown) {
    console.error(`Failed to fetch candles for ${symbol}:`, err);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateAssetDataAction(params: {
  symbol: string;
  provider: 'yahoo' | 'coingecko' | 'dexscreener';
  identifier: string;
  chain?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  message: string;
  count?: number;
  startDate?: string;
  endDate?: string;
  latestPrice?: number;
}> {
  try {
    const { syncAssetFromProvider } = await import('@/lib/data/sync-asset');
    return await syncAssetFromProvider(params);
  } catch (err: unknown) {
    console.error('Error in updateAssetDataAction:', err);
    return {
      success: false,
      message: (err as Error).message || 'Failed to update asset data.',
    };
  }
}
