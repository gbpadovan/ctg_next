'use client';

import React from 'react';
import { CTGAnalysisResult } from '@/lib/indicators/ctg';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from 'lucide-react';

interface Props {
  summary: CTGAnalysisResult['summary'];
  symbol: string;
}

export const MetricCards: React.FC<Props> = ({ summary, symbol }) => {
  const isPositiveRoc = summary.latestRocP4 >= 0;
  const isBuy = summary.currentSignal === 'buy';
  const isSell = summary.currentSignal === 'sell';

  const formatPrice = (val: number) => {
    if (val === 0) return '$0.00';
    if (val < 0.0001) return `$${val.toExponential(4)}`;
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const formatRatio = (val: number) => {
    if (val === 0) return '0.00';
    if (val < 0.0001) return val.toExponential(4);
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. Current CTG Signal */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            CTG Signal State
          </span>
          <div
            className={`p-2 rounded-xl ${
              isBuy
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isSell
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tracking-tight uppercase ${
              isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {isBuy ? 'BUY / BULLISH' : isSell ? 'SELL / BEARISH' : 'HOLD / NEUTRAL'}
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isBuy ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isBuy ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <span>Momentum Regime</span>
          <span className="font-mono text-slate-300 font-medium">
            {isBuy ? 'Crypto Outperforming Gold' : 'Gold Outperforming Crypto'}
          </span>
        </div>
      </div>

      {/* 2. 4-Week Rate of Change (ROC) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            4-Week ROC Oscillator
          </span>
          <div
            className={`p-2 rounded-xl ${
              isPositiveRoc
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-2xl font-mono font-bold tracking-tight ${
              isPositiveRoc ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveRoc ? '+' : ''}
            {summary.latestRocP4.toFixed(2)}%
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <span>Zero-Line Distance</span>
          <span className="font-mono text-slate-300 font-medium">
            {summary.latestRocP4 >= 0 ? 'Above Baseline (0%)' : 'Below Baseline (0%)'}
          </span>
        </div>
      </div>

      {/* 3. Purchasing Power Ratio */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current {symbol}/Gold Ratio
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Scale className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-amber-300 tracking-tight">
            {formatRatio(summary.latestRatio)}
          </span>
          <span className="text-xs text-slate-400 font-mono">oz / unit</span>
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <span>Range in Period</span>
          <span className="font-mono text-slate-300">
            {formatRatio(summary.ratioLow)} - {formatRatio(summary.ratioHigh)}
          </span>
        </div>
      </div>

      {/* 4. Trend Longevity & Prices */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Trend Longevity
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-mono font-bold text-blue-400 tracking-tight">
            {summary.daysInTrend}
          </span>
          <span className="text-xs text-slate-400">days in trend</span>
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <span>Last Signal Date</span>
          <span className="font-mono text-slate-300">
            {summary.lastSignalDate || 'Initial Base'}
          </span>
        </div>
      </div>
    </div>
  );
};
