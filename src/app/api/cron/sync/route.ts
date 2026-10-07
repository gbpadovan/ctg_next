import { NextResponse } from 'next/server';
import { CTGDataService } from '@/lib/data/service';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const secretQuery = url.searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    if (expectedSecret && !isDev) {
      const token = authHeader?.replace('Bearer ', '') || secretQuery;
      if (token !== expectedSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid cron secret' },
          { status: 401 }
        );
      }
    }

    const result = await CTGDataService.syncAllToDatabase();
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      message: result.message,
      details: result.details,
    });
  } catch (error) {
    console.error('Error during sync cron job:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // Allow GET trigger for standard browser testing and Vercel Cron jobs
  return POST(request);
}
