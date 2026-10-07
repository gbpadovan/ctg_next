'use client';

import React, { useState } from 'react';
import { CTGDataPoint } from '@/lib/indicators/ctg';
import { Download, Filter, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface Props {
  data: CTGDataPoint[];
  symbol: string;
}

interface SignalEvent {
  date: string;
  signal: 'buy' | 'sell';
  tokenPrice: number;
  goldPrice: number;
  ratio: number;
  returnPct?: number;
  durationDays?: number;
}

export const SignalHistoryTable: React.FC<Props> = ({ data, symbol }) => {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Extract all crossover points
  const signalEvents: SignalEvent[] = [];
  const signals = data.filter((d) => d.signal === 'buy' || d.signal === 'sell');

  for (let i = 0; i < signals.length; i++) {
    const cur = signals[i];
    const next = signals[i + 1] || data[data.length - 1]; // next signal or latest point

    let returnPct: number | undefined;
    let durationDays: number | undefined;

    if (cur.token.close > 0 && next && next.token.close > 0) {
      returnPct = ((next.token.close - cur.token.close) / cur.token.close) * 100;
      const t1 = new Date(cur.date).getTime();
      const t2 = new Date(next.date).getTime();
      durationDays = Math.round((t2 - t1) / (1000 * 3600 * 24));
    }

    signalEvents.push({
      date: cur.date,
      signal: cur.signal as 'buy' | 'sell',
      tokenPrice: cur.token.close,
      goldPrice: cur.gold.close,
      ratio: cur.ratio,
      returnPct,
      durationDays,
    });
  }

  // Reverse so newest is on top
  const sortedEvents = [...signalEvents].reverse();
  const filteredEvents =
    filter === 'all'
      ? sortedEvents
      : sortedEvents.filter((e) => e.signal === filter);

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

  const handleExportCSV = () => {
    const headers = ['Date', 'Signal', `${symbol}_Price_USD`, 'Gold_Price_USD', 'Ratio', 'Return_Pct', 'Days'];
    const rows = sortedEvents.map((e) => [
      e.date,
      e.signal.toUpperCase(),
      e.tokenPrice,
      e.goldPrice,
      e.ratio,
      e.returnPct !== undefined ? e.returnPct.toFixed(2) : '',
      e.durationDays !== undefined ? e.durationDays : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${symbol}_CTG_Signals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-4">
      {/* Table Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Historical Signal Crossovers & Regimes
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {filteredEvents.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('buy')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'buy' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Buy Only
            </button>
            <button
              onClick={() => setFilter('sell')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filter === 'sell' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sell Only
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700"
            title="Download signals to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Signal</th>
              <th className="py-3 px-4 text-right">{symbol} USD</th>
              <th className="py-3 px-4 text-right">Gold USD</th>
              <th className="py-3 px-4 text-right">Ratio</th>
              <th className="py-3 px-4 text-right">Duration</th>
              <th className="py-3 px-4 text-right">Return to Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                  No signal crossovers found in the selected range.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt, idx) => {
                const isBuy = evt.signal === 'buy';
                return (
                  <tr key={`${evt.date}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-200">{evt.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold font-mono text-[10px] uppercase ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-200">
                      {formatPrice(evt.tokenPrice)}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-amber-300">
                      ${evt.goldPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-cyan-300">
                      {formatRatio(evt.ratio)}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-400">
                      {evt.durationDays !== undefined ? `${evt.durationDays}d` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-right font-medium">
                      {evt.returnPct !== undefined ? (
                        <span className={evt.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {evt.returnPct >= 0 ? '+' : ''}
                          {evt.returnPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
