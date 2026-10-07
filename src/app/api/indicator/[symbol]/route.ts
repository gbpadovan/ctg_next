import { NextResponse } from 'next/server';
import { CTGDataService } from '@/lib/data/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const url = new URL(request.url);
    const modeParam = url.searchParams.get('mode');
    const mode = modeParam === 'weekly_interpolated' ? 'weekly_interpolated' : 'rolling_daily';
    const startDate = url.searchParams.get('startDate') || '2023-01-01';
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const analysis = await CTGDataService.getCTGAnalysis(symbol, {
      mode,
      startDate,
      forceRefresh,
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: `Token symbol '${symbol}' not found or has no price data.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error in indicator API:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
