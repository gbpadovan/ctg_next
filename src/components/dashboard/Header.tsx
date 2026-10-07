'use client';

import React from 'react';
import { Database, RefreshCw, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  latestGoldPrice?: number;
  isDbConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  mode: 'rolling_daily' | 'weekly_interpolated';
  onModeChange: (m: 'rolling_daily' | 'weekly_interpolated') => void;
}

export const DashboardHeader: React.FC<Props> = ({
  latestGoldPrice,
  isDbConnected,
  onRefresh,
  isRefreshing,
  mode,
  onModeChange,
}) => {
  return (
    <header className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 px-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-lg">
      {/* Brand & Concept */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-tight">
          CTG
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Crypto to Gold Indicator
            </h1>
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Next.js 16
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Purchasing Power & Momentum Oscillator inspired by Michael Silva
          </p>
        </div>
      </div>

      {/* Status Badges & Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Gold Spot Ticker */}
        {latestGoldPrice && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gold (GC=F):</span>
            <span className="font-bold text-amber-200">
              ${latestGoldPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Database Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
            isDbConnected
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
          }`}
          title={
            isDbConnected
              ? 'Neon Serverless Postgres connected'
              : 'Direct Live Provider Mode (Yahoo Finance & DexScreener)'
          }
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isDbConnected ? 'Neon Connected' : 'Live Real-Time'}</span>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => onModeChange('rolling_daily')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'rolling_daily'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Continuous 28-day rolling window - eliminates historical revisions"
          >
            Rolling 28D
          </button>
          <button
            onClick={() => onModeChange('weekly_interpolated')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              mode === 'weekly_interpolated'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Original Python algorithm: weekly sampling with daily linear interpolation"
          >
            Classic Weekly
          </button>
        </div>

        {/* Manual Refresh / Sync Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
};
