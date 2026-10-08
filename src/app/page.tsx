'use client';

import React, { useState, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { DashboardHeader } from '@/components/dashboard/Header';
import { TokenSelector } from '@/components/dashboard/TokenSelector';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { SignalHistoryTable } from '@/components/dashboard/SignalHistoryTable';
import { SUPPORTED_TOKENS, TokenDefinition } from '@/lib/data/tokens';
import { CTGAnalysisResult } from '@/lib/indicators/ctg';
import { fetchIndicatorAction, triggerManualSyncAction } from './actions';
import { getCurrentUserAction, logoutAction } from './actions/auth';
import { SessionPayload } from '@/lib/auth/session';
import {
  Info,
  Layers,
  ArrowRight,
  Calculator,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Dynamically import TradingView chart to guarantee client-side only canvas rendering
const CTGChart = dynamic(
  () => import('@/components/charts/CTGChart').then((mod) => mod.CTGChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[560px] rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Initializing TradingView Engine...</span>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [tokens] = useState<TokenDefinition[]>(SUPPORTED_TOKENS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [mode, setMode] = useState<'rolling_daily' | 'weekly_interpolated'>('rolling_daily');
  const [analysis, setAnalysis] = useState<CTGAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  const [syncStatus, setSyncStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<SessionPayload | null>(null);

  // Check database status, load initial token, and get current user
  useEffect(() => {
    fetch('/api/tokens')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.databaseConnected !== undefined) {
          setIsDbConnected(data.databaseConnected);
        }
      })
      .catch((err) => console.warn('Could not verify DB status:', err));

    getCurrentUserAction()
      .then((user) => {
        if (!user) {
          window.location.href = '/login';
        } else {
          setCurrentUser(user);
        }
      })
      .catch((err) => {
        console.warn('Could not verify current user:', err);
        window.location.href = '/login';
      });
  }, []);

  // Fetch indicator data whenever selected token or mode changes
  const loadIndicatorData = (symbol: string, currentMode: 'rolling_daily' | 'weekly_interpolated', forceRefresh: boolean = false) => {
    setLoading(true);
    startTransition(async () => {
      const res = await fetchIndicatorAction(symbol, currentMode, forceRefresh);
      if (res.success && res.data) {
        setAnalysis(res.data);
      } else {
        console.error('Failed to load indicator data:', res.error);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadIndicatorData(selectedSymbol, mode);
  }, [selectedSymbol, mode]);

  const handleRefresh = async () => {
    setSyncStatus(null);
    const syncRes = await triggerManualSyncAction();
    setSyncStatus({ success: syncRes.success, message: syncRes.message });
    loadIndicatorData(selectedSymbol, mode, true);
  };

  const selectedTokenDef = tokens.find(
    (t) => t.symbol.toUpperCase() === selectedSymbol.toUpperCase()
  );

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <div className="min-h-screen w-full bg-[#070a12] text-slate-100">
      <div className="flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6">
        {/* 1. Header */}
        <DashboardHeader
        latestGoldPrice={analysis?.summary.latestGoldPrice}
        isDbConnected={isDbConnected}
        onRefresh={handleRefresh}
        isRefreshing={isPending || loading}
        mode={mode}
        onModeChange={(m) => setMode(m)}
        user={currentUser ? { name: currentUser.name, email: currentUser.email } : null}
        onLogout={handleLogout}
      />

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-mono transition-all ${
            syncStatus.success
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}
        >
          {syncStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* 2. Token Selector */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider">Select Cryptocurrency</span>
          <span className="text-[11px] font-mono">
            Mode: <strong className="text-blue-400">{mode === 'rolling_daily' ? 'Rolling 28D' : 'Classic Weekly'}</strong>
          </span>
        </div>
        <TokenSelector
          tokens={tokens}
          selectedSymbol={selectedSymbol}
          onSelectToken={(sym) => setSelectedSymbol(sym)}
        />
      </section>

      {/* 3. Metric Cards */}
      {analysis && (
        <MetricCards summary={analysis.summary} symbol={selectedSymbol} />
      )}

      {/* 4. Chart Visualization */}
      <section className="w-full">
        {loading && !analysis ? (
          <div className="w-full h-[560px] rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-mono">
              Computing CTG Indicator for {selectedSymbol}...
            </span>
          </div>
        ) : analysis ? (
          <CTGChart
            data={analysis.data}
            tokenSymbol={selectedSymbol}
            tokenName={selectedTokenDef?.name}
          />
        ) : (
          <div className="w-full h-80 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-400">
            No price series data available for {selectedSymbol}.
          </div>
        )}
      </section>

      {/* 5. Signal History Table */}
      {analysis && (
        <section className="w-full">
          <SignalHistoryTable data={analysis.data} symbol={selectedSymbol} />
        </section>
      )}

      {/* 6. Quantitative Methodology & Information */}
      <section className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
          <Calculator className="w-4 h-4 text-blue-400" />
          <span>CTG (Crypto to Gold) Formula & Quantitative Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              1. Ratio Calculation
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <span className="font-mono text-amber-300 block mb-1">Ratio(t) = Token Price(t) / Gold Price(t)</span>
              Evaluates the true purchasing power of the cryptocurrency free from fiat USD inflationary debasement. Missing weekend gold closes are linearly interpolated.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              2. 4-Week Rate of Change (ROC)
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <span className="font-mono text-blue-300 block mb-1">ROC_4W(t) = ((Ratio(t) - Ratio(t-28)) / Ratio(t-28)) * 100</span>
              Computes the momentum oscillator over a 4-week window. Zero serves as the structural equilibrium line.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              3. Zero-Line Crossover Signals
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <strong className="text-emerald-400">BUY Signal (+1):</strong> When ROC crosses from negative to positive (&ge; 0). Crypto is gaining momentum against Gold.<br />
              <strong className="text-rose-400">SELL Signal (-1):</strong> When ROC crosses below zero (&lt; 0). Gold is outperforming Crypto.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-slate-500 border-t border-slate-800/60 font-mono">
        <div>
          CTG Next Terminal • Migrated to Next.js 16, TypeScript & Neon Serverless
        </div>
        <div className="flex items-center gap-4">
          <span>COMEX Gold (GC=F)</span>
          <span>•</span>
          <span>TradingView Lightweight Charts v5</span>
        </div>
      </footer>
    </div>
  </div>
);
}
