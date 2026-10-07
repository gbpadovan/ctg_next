export interface DailyCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface DailyPriceWithOHLC {
  date: string; // YYYY-MM-DD
  token: DailyCandle;
  gold: DailyCandle;
}

export interface CTGDataPoint {
  date: string;
  token: DailyCandle;
  gold: DailyCandle;
  ratio: number; // Token Close / Gold Close
  rocP4: number; // 4-week Rate of Change on Ratio (%)
  signal: 'buy' | 'sell' | 'hold';
  signalValue: 1 | -1 | 0;
}

export interface CTGAnalysisResult {
  symbol: string;
  mode: 'rolling_daily' | 'weekly_interpolated';
  data: CTGDataPoint[];
  summary: {
    latestDate: string;
    latestTokenPrice: number;
    latestGoldPrice: number;
    latestRatio: number;
    latestRocP4: number;
    currentSignal: 'buy' | 'sell' | 'hold';
    daysInTrend: number;
    lastSignalDate: string | null;
    lastSignalType: 'buy' | 'sell' | null;
    totalSignals: number;
    ratioHigh: number;
    ratioLow: number;
  };
}

/**
 * Linearly interpolates missing gold prices for weekends / market holidays
 * matching the original Python merge_d['close_gold'].interpolate('linear')
 */
export function interpolateGoldPrices(
  data: { date: string; token: DailyCandle; gold: DailyCandle | null }[]
): DailyPriceWithOHLC[] {
  if (data.length === 0) return [];

  // Sort chronologically
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // Find known gold entries
  const knownIndices: number[] = [];
  sorted.forEach((item, index) => {
    if (item.gold !== null && !isNaN(item.gold.close) && item.gold.close > 0) {
      knownIndices.push(index);
    }
  });

  if (knownIndices.length === 0) {
    // Fallback if no gold data at all
    const defaultGold: DailyCandle = { open: 2000, high: 2000, low: 2000, close: 2000 };
    return sorted.map((item) => ({
      date: item.date,
      token: item.token,
      gold: defaultGold,
    }));
  }

  const result: DailyPriceWithOHLC[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];

    if (item.gold !== null && !isNaN(item.gold.close) && item.gold.close > 0) {
      result.push({
        date: item.date,
        token: item.token,
        gold: item.gold,
      });
      continue;
    }

    // Missing gold: perform linear interpolation
    let prevIdx = -1;
    let nextIdx = -1;

    for (const k of knownIndices) {
      if (k < i) prevIdx = k;
      if (k > i && nextIdx === -1) nextIdx = k;
    }

    let interpolatedGold: DailyCandle;

    if (prevIdx !== -1 && nextIdx !== -1) {
      // Linear interpolation between prev and next
      const prevGold = sorted[prevIdx].gold!;
      const nextGold = sorted[nextIdx].gold!;
      const factor = (i - prevIdx) / (nextIdx - prevIdx);

      const close = prevGold.close + (nextGold.close - prevGold.close) * factor;
      const open = prevGold.open + (nextGold.open - prevGold.open) * factor;
      const high = Math.max(open, close, prevGold.high + (nextGold.high - prevGold.high) * factor);
      const low = Math.min(open, close, prevGold.low + (nextGold.low - prevGold.low) * factor);

      interpolatedGold = { open, high, low, close, volume: 0 };
    } else if (prevIdx !== -1) {
      // Forward-fill from last known
      interpolatedGold = { ...sorted[prevIdx].gold! };
    } else {
      // Back-fill from first known
      interpolatedGold = { ...sorted[nextIdx].gold! };
    }

    result.push({
      date: item.date,
      token: item.token,
      gold: interpolatedGold,
    });
  }

  return result;
}

/**
 * Calculates CTG Indicator in rolling 28-day mode
 */
export function computeCTGRollingDaily(
  dailyPrices: DailyPriceWithOHLC[],
  windowDays: number = 28
): CTGDataPoint[] {
  const sorted = [...dailyPrices].sort((a, b) => a.date.localeCompare(b.date));
  const results: CTGDataPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const ratio = current.gold.close > 0 ? current.token.close / current.gold.close : 0;

    let rocP4 = 0;
    if (i >= windowDays) {
      const past = sorted[i - windowDays];
      const pastRatio = past.gold.close > 0 ? past.token.close / past.gold.close : 0;
      rocP4 = pastRatio > 0 ? ((ratio - pastRatio) / pastRatio) * 100 : 0;
    }

    // Zero-line crossover signal detection
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let signalValue: 1 | -1 | 0 = 0;

    if (i > windowDays) {
      const prevRoc = results[i - 1]?.rocP4 ?? 0;
      if (rocP4 >= 0 && prevRoc < 0) {
        signal = 'buy';
        signalValue = 1;
      } else if (rocP4 < 0 && prevRoc >= 0) {
        signal = 'sell';
        signalValue = -1;
      }
    }

    results.push({
      date: current.date,
      token: current.token,
      gold: current.gold,
      ratio,
      rocP4,
      signal,
      signalValue,
    });
  }

  return results;
}

/**
 * Calculates CTG Indicator in weekly interpolated mode (exact replica of Python project)
 */
export function computeCTGWeeklyInterpolated(
  dailyPrices: DailyPriceWithOHLC[],
  windowWeeks: number = 4
): CTGDataPoint[] {
  if (dailyPrices.length === 0) return [];
  const sorted = [...dailyPrices].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Group by weekly Sunday closes
  const weeklyMap = new Map<string, { date: string; ratio: number }>();

  sorted.forEach((item) => {
    const d = new Date(item.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay(); // 0 is Sunday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const sundayDate = new Date(d);
    sundayDate.setUTCDate(d.getUTCDate() + daysUntilSunday);
    const sundayKey = sundayDate.toISOString().split('T')[0];

    const ratio = item.gold.close > 0 ? item.token.close / item.gold.close : 0;
    // Keep the latest observation in the week
    weeklyMap.set(sundayKey, { date: sundayKey, ratio });
  });

  const weeklyEntries = Array.from(weeklyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Compute 4-week ROC on weekly ratio
  const weeklyRoc: { date: string; ratio: number; roc: number }[] = [];
  for (let w = 0; w < weeklyEntries.length; w++) {
    const cur = weeklyEntries[w];
    let roc = 0;
    if (w >= windowWeeks) {
      const past = weeklyEntries[w - windowWeeks];
      roc = past.ratio > 0 ? ((cur.ratio - past.ratio) / past.ratio) * 100 : 0;
    }
    weeklyRoc.push({ date: cur.date, ratio: cur.ratio, roc });
  }

  // 2. Linearly interpolate weekly ROC across all daily dates
  const dailyDateMap = new Map<string, number>();
  if (weeklyRoc.length > 0) {
    for (let w = 0; w < weeklyRoc.length - 1; w++) {
      const w1 = weeklyRoc[w];
      const w2 = weeklyRoc[w + 1];
      const t1 = new Date(w1.date + 'T00:00:00Z').getTime();
      const t2 = new Date(w2.date + 'T00:00:00Z').getTime();
      const diffTime = t2 - t1;

      sorted.forEach((day) => {
        const t = new Date(day.date + 'T00:00:00Z').getTime();
        if (t >= t1 && t <= t2) {
          const factor = diffTime > 0 ? (t - t1) / diffTime : 0;
          const interpolatedRoc = w1.roc + (w2.roc - w1.roc) * factor;
          dailyDateMap.set(day.date, interpolatedRoc);
        }
      });
    }

    // Extend for any tail dates
    const lastWeekly = weeklyRoc[weeklyRoc.length - 1];
    sorted.forEach((day) => {
      if (!dailyDateMap.has(day.date)) {
        dailyDateMap.set(day.date, lastWeekly.roc);
      }
    });
  }

  const results: CTGDataPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const ratio = current.gold.close > 0 ? current.token.close / current.gold.close : 0;
    const rocP4 = dailyDateMap.get(current.date) ?? 0;

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    let signalValue: 1 | -1 | 0 = 0;

    if (i > 0) {
      const prevRoc = results[i - 1]?.rocP4 ?? 0;
      if (rocP4 >= 0 && prevRoc < 0) {
        signal = 'buy';
        signalValue = 1;
      } else if (rocP4 < 0 && prevRoc >= 0) {
        signal = 'sell';
        signalValue = -1;
      }
    }

    results.push({
      date: current.date,
      token: current.token,
      gold: current.gold,
      ratio,
      rocP4,
      signal,
      signalValue,
    });
  }

  return results;
}

/**
 * Primary calculation entrypoint
 */
export function computeCTG(
  dailyPrices: DailyPriceWithOHLC[],
  options: {
    mode?: 'rolling_daily' | 'weekly_interpolated';
    windowWeeks?: number;
    symbol?: string;
  } = {}
): CTGAnalysisResult {
  const mode = options.mode || 'rolling_daily';
  const symbol = options.symbol || 'ASSET';

  const data =
    mode === 'weekly_interpolated'
      ? computeCTGWeeklyInterpolated(dailyPrices, options.windowWeeks || 4)
      : computeCTGRollingDaily(dailyPrices, (options.windowWeeks || 4) * 7);

  // Compute summary metrics
  const lastPoint = data[data.length - 1] || {
    date: new Date().toISOString().split('T')[0],
    token: { open: 0, high: 0, low: 0, close: 0 },
    gold: { open: 0, high: 0, low: 0, close: 0 },
    ratio: 0,
    rocP4: 0,
    signal: 'hold' as const,
    signalValue: 0 as const,
  };

  let lastSignalDate: string | null = null;
  let lastSignalType: 'buy' | 'sell' | null = null;
  let totalSignals = 0;
  let daysInTrend = 0;
  let ratioHigh = 0;
  let ratioLow = Infinity;

  // Track signals and find current streak
  for (let i = data.length - 1; i >= 0; i--) {
    const pt = data[i];
    if (pt.ratio > ratioHigh) ratioHigh = pt.ratio;
    if (pt.ratio > 0 && pt.ratio < ratioLow) ratioLow = pt.ratio;

    if (pt.signal === 'buy' || pt.signal === 'sell') {
      totalSignals++;
      if (!lastSignalDate) {
        lastSignalDate = pt.date;
        lastSignalType = pt.signal;
        daysInTrend = data.length - 1 - i;
      }
    }
  }

  if (ratioLow === Infinity) ratioLow = 0;

  // Determine current signal state (is ROC positive or negative?)
  const currentSignalState: 'buy' | 'sell' | 'hold' =
    lastPoint.rocP4 > 0 ? 'buy' : lastPoint.rocP4 < 0 ? 'sell' : 'hold';

  return {
    symbol,
    mode,
    data,
    summary: {
      latestDate: lastPoint.date,
      latestTokenPrice: lastPoint.token.close,
      latestGoldPrice: lastPoint.gold.close,
      latestRatio: lastPoint.ratio,
      latestRocP4: lastPoint.rocP4,
      currentSignal: currentSignalState,
      daysInTrend,
      lastSignalDate,
      lastSignalType,
      totalSignals,
      ratioHigh,
      ratioLow,
    },
  };
}
