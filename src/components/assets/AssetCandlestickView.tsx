'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AssetCandle } from '@/lib/data/assets';
import { fetchAssetCandlesAction } from '@/app/actions/assets';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Filter,
  RotateCcw,
  Clock,
  Sparkles,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { IsoDateInput } from '@/components/ui/IsoDateInput';

// Dynamically import chart component for client-side canvas rendering
const AssetCandlestickChart = dynamic(
  () =>
    import('@/components/charts/AssetCandlestickChart').then(
      (mod) => mod.AssetCandlestickChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[540px] rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-mono">
          Initializing Candlestick Chart Engine...
        </span>
      </div>
    ),
  }
);

interface Props {
  symbol: string;
  name: string;
  quoteToken: string;
  initialCandles: AssetCandle[];
  minAvailableDate: string | null;
  maxAvailableDate: string | null;
}

export function AssetCandlestickView({
  symbol,
  name,
  quoteToken,
  initialCandles,
  minAvailableDate,
  maxAvailableDate,
}: Props) {
  const [candles, setCandles] = useState<AssetCandle[]>(initialCandles);
  const [activePreset, setActivePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(
    minAvailableDate || '2023-01-01'
  );
  const [endDate, setEndDate] = useState<string>(
    maxAvailableDate || new Date().toISOString().slice(0, 10)
  );
  const [isPending, startTransition] = useTransition();

  // Filter candles based on selected dates
  const filteredCandles = useMemo(() => {
    return candles.filter((c) => {
      const isAfterStart = !startDate || c.time >= startDate;
      const isBeforeEnd = !endDate || c.time <= endDate;
      return isAfterStart && isBeforeEnd;
    });
  }, [candles, startDate, endDate]);

  // Compute key summary statistics for the filtered range
  const stats = useMemo(() => {
    if (filteredCandles.length === 0) return null;

    const first = filteredCandles[0];
    const last = filteredCandles[filteredCandles.length - 1];

    let highest = -Infinity;
    let lowest = Infinity;
    let totalVolume = 0;

    for (const c of filteredCandles) {
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
      totalVolume += c.volume || 0;
    }

    const priceChange = last.close - first.open;
    const priceChangePct = first.open > 0 ? (priceChange / first.open) * 100 : 0;

    return {
      firstPrice: first.open,
      lastPrice: last.close,
      high: highest,
      low: lowest,
      change: priceChange,
      changePct: priceChangePct,
      totalVolume,
      isPositive: priceChange >= 0,
    };
  }, [filteredCandles]);

  // Handle Preset selection
  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    const end = maxAvailableDate || new Date().toISOString().slice(0, 10);
    setEndDate(end);

    const now = new Date(end);
    let startD = new Date(now);

    if (preset === '1M') {
      startD.setMonth(now.getMonth() - 1);
    } else if (preset === '3M') {
      startD.setMonth(now.getMonth() - 3);
    } else if (preset === '6M') {
      startD.setMonth(now.getMonth() - 6);
    } else if (preset === '1Y') {
      startD.setFullYear(now.getFullYear() - 1);
    } else if (preset === 'ALL') {
      setStartDate(minAvailableDate || '2021-01-01');
      return;
    }

    const startStr = startD.toISOString().slice(0, 10);
    setStartDate(startStr < (minAvailableDate || '') ? (minAvailableDate || '') : startStr);
  };

  // Re-fetch from server action if user picks a custom wider date range
  const handleApplyCustomFilter = () => {
    setActivePreset('CUSTOM');
    startTransition(async () => {
      const res = await fetchAssetCandlesAction(symbol, startDate, endDate);
      if (res.success && res.data) {
        setCandles(res.data.candles);
      }
    });
  };

  const handleResetFilter = () => {
    setActivePreset('ALL');
    setStartDate(minAvailableDate || '2021-01-01');
    setEndDate(maxAvailableDate || new Date().toISOString().slice(0, 10));
    setCandles(initialCandles);
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header with Back Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 px-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            id="back-to-assets-btn"
            href="/assets"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 hover:text-white transition shadow-sm group"
            title="Return to Database Assets Directory"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {name} ({symbol})
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {quoteToken}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Daily OHLCV Candlestick Chart & Historical Database Explorer
            </p>
          </div>
        </div>

        {/* Database Availability Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Archived Range:</span>
          <span className="text-amber-300 font-semibold">
            {minAvailableDate || 'N/A'} → {maxAvailableDate || 'N/A'}
          </span>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Latest Close */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              Current Close
            </span>
            <div className="text-xl font-black text-white font-mono">
              ${stats.lastPrice >= 1 ? stats.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stats.lastPrice.toFixed(6)}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Last bar close in interval
            </span>
          </div>

          {/* Range Performance Change */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              Period Performance
            </span>
            <div
              className={`text-xl font-black font-mono flex items-center gap-1.5 ${
                stats.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.isPositive ? (
                <TrendingUp className="w-4 h-4 shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 shrink-0" />
              )}
              <span>
                {stats.isPositive ? '+' : ''}
                {stats.changePct.toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {stats.isPositive ? '+' : ''}${stats.change.toFixed(2)}
            </span>
          </div>

          {/* Range High */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              Period High
            </span>
            <div className="text-xl font-black text-emerald-400 font-mono">
              ${stats.high >= 1 ? stats.high.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stats.high.toFixed(6)}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Peak price in interval
            </span>
          </div>

          {/* Range Low */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              Period Low
            </span>
            <div className="text-xl font-black text-rose-400 font-mono">
              ${stats.low >= 1 ? stats.low.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stats.low.toFixed(6)}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Trough price in interval
            </span>
          </div>
        </div>
      )}

      {/* 3. Customizable Date Range Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        {/* Quick Range Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Intervals:
          </span>
          {['1M', '3M', '6M', '1Y', 'ALL'].map((preset) => (
            <button
              key={preset}
              id={`preset-${preset.toLowerCase()}-btn`}
              onClick={() => handlePresetSelect(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition ${
                activePreset === preset
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <label htmlFor="custom-start-date" className="text-slate-300 flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">Start:</span>
              <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                YYYY-MM-DD
              </span>
            </label>
            <div className="w-36">
              <IsoDateInput
                id="custom-start-date"
                value={startDate}
                min={minAvailableDate || '2020-01-01'}
                max={endDate}
                onChange={(val) => {
                  setActivePreset('CUSTOM');
                  setStartDate(val);
                }}
                focusColor="blue"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <label htmlFor="custom-end-date" className="text-slate-300 flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">End:</span>
              <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                YYYY-MM-DD
              </span>
            </label>
            <div className="w-36">
              <IsoDateInput
                id="custom-end-date"
                value={endDate}
                min={startDate}
                max={maxAvailableDate || new Date().toISOString().slice(0, 10)}
                onChange={(val) => {
                  setActivePreset('CUSTOM');
                  setEndDate(val);
                }}
                focusColor="blue"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2">
            <button
              id="apply-filter-btn"
              onClick={handleApplyCustomFilter}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isPending ? 'Filtering...' : 'Apply'}</span>
            </button>

            <button
              id="reset-filter-btn"
              onClick={handleResetFilter}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Reset to full historical date range"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Candlestick Chart Area */}
      <div className="w-full">
        {filteredCandles.length > 0 ? (
          <AssetCandlestickChart
            candles={filteredCandles}
            symbol={symbol}
            name={name}
            quoteToken={quoteToken}
          />
        ) : (
          <div className="w-full h-80 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 p-6">
            <BarChart2 className="w-8 h-8 text-slate-600" />
            <span className="font-semibold text-sm">
              No daily candles found between {startDate} and {endDate}.
            </span>
            <button
              onClick={handleResetFilter}
              className="mt-2 text-xs text-blue-400 underline underline-offset-4 hover:text-blue-300"
            >
              Reset to all available dates
            </button>
          </div>
        )}
      </div>

      {/* 5. Quantitative Documentation / Footnote */}
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-950/50 border border-slate-900 text-xs font-mono text-slate-500">
        <div>
          Archive: {symbol} • {filteredCandles.length} candles plotted • Neon PostgreSQL Serverless
        </div>
        <div className="flex items-center gap-2">
          <span>Daily Sample</span>
          <span>•</span>
          <span>Linear Interpolation</span>
        </div>
      </div>
    </div>
  );
}
