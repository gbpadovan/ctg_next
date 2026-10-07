import YahooFinance from 'yahoo-finance2';
import { OHLCVPoint } from './gold';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export async function fetchYahooCryptoHistorical(
  symbol: string,
  startDate: string = '2023-01-01',
  endDate?: string
): Promise<OHLCVPoint[]> {
  try {
    const formattedSymbol = symbol.toUpperCase().endsWith('-USD') ? symbol.toUpperCase() : `${symbol.toUpperCase()}-USD`;
    const period1 = new Date(startDate);
    const period2 = endDate ? new Date(endDate) : new Date();

    const result = await yf.chart(formattedSymbol, {
      period1,
      period2,
      interval: '1d',
    });

    if (!result?.quotes || result.quotes.length === 0) {
      return [];
    }

    return result.quotes
      .filter((q) => q.close !== null && q.close !== undefined && !isNaN(q.close))
      .map((q) => {
        const dateStr = new Date(q.date).toISOString().split('T')[0];
        const close = Number(q.close);
        return {
          date: dateStr,
          open: Number(q.open ?? close),
          high: Number(q.high ?? close),
          low: Number(q.low ?? close),
          close,
          volume: Number(q.volume ?? 0),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`Error fetching ${symbol} from Yahoo Finance:`, error);
    return [];
  }
}

export async function fetchYahooCryptoLatest(symbol: string): Promise<OHLCVPoint | null> {
  try {
    const formattedSymbol = symbol.toUpperCase().endsWith('-USD') ? symbol.toUpperCase() : `${symbol.toUpperCase()}-USD`;
    const quote = await yf.quote(formattedSymbol);
    if (!quote || quote.regularMarketPrice === undefined) {
      return null;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const price = Number(quote.regularMarketPrice);

    return {
      date: todayStr,
      open: Number(quote.regularMarketOpen ?? price),
      high: Number(quote.regularMarketDayHigh ?? price),
      low: Number(quote.regularMarketDayLow ?? price),
      close: price,
      volume: Number(quote.regularMarketVolume ?? 0),
    };
  } catch (error) {
    console.error(`Error fetching latest quote for ${symbol}:`, error);
    return null;
  }
}
