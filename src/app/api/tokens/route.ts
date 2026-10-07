import { NextResponse } from 'next/server';
import { CTGDataService } from '@/lib/data/service';
import { getDb } from '@/db';

export async function GET() {
  try {
    const tokens = CTGDataService.getSupportedTokens();
    const isDbConnected = getDb() !== null;

    return NextResponse.json({
      success: true,
      databaseConnected: isDbConnected,
      tokens,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
