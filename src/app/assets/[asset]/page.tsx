'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { AssetCandlestickView } from '@/components/assets/AssetCandlestickView';
import { fetchAssetCandlesAction } from '@/app/actions/assets';
import { AssetCandle } from '@/lib/data/assets';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ asset: string }>;
}

function AssetDetailSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="w-full h-20 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse"
          />
        ))}
      </div>
      <div className="w-full h-[540px] rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-mono">
          Loading Candlesticks...
        </span>
      </div>
    </div>
  );
}

function AssetDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.asset.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    symbol: string;
    name: string;
    quoteToken: string;
    candles: AssetCandle[];
    minAvailableDate: string | null;
    maxAvailableDate: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAssetCandlesAction(symbol)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || `Could not find candlestick data for ${symbol}.`);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return <AssetDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <h2 className="text-lg font-bold text-white">Asset Not Found</h2>
        <p className="text-xs text-slate-400">
          {error || `No historical data is available for ${symbol}.`}
        </p>
        <Link
          href="/assets"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Assets Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <AssetCandlestickView
      symbol={data.symbol}
      name={data.name}
      quoteToken={data.quoteToken}
      initialCandles={data.candles}
      minAvailableDate={data.minAvailableDate}
      maxAvailableDate={data.maxAvailableDate}
    />
  );
}

export default function AssetDetailPage({ params }: PageProps) {
  return (
    <AppShell>
      <Suspense fallback={<AssetDetailSkeleton />}>
        <AssetDetailContent params={params} />
      </Suspense>
    </AppShell>
  );
}
