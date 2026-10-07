'use server';

import { CTGDataService } from '@/lib/data/service';
import { CTGAnalysisResult } from '@/lib/indicators/ctg';

export async function fetchIndicatorAction(
  symbol: string,
  mode: 'rolling_daily' | 'weekly_interpolated' = 'rolling_daily',
  forceRefresh: boolean = false
): Promise<{ success: boolean; data?: CTGAnalysisResult; error?: string }> {
  try {
    const analysis = await CTGDataService.getCTGAnalysis(symbol, {
      mode,
      forceRefresh,
    });

    if (!analysis) {
      return { success: false, error: `Could not compute indicator for ${symbol}.` };
    }

    return { success: true, data: analysis };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function triggerManualSyncAction(): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, number>;
}> {
  try {
    const result = await CTGDataService.syncAllToDatabase();
    return result;
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}
