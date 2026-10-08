'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseAssetSummary } from '@/lib/data/assets';
import { ASSET_PROVIDER_MAPPINGS } from '@/lib/data/tokens';
import { updateAssetDataAction } from '@/app/actions/assets';
import {
  X,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Info,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { IsoDateInput } from '@/components/ui/IsoDateInput';

interface Props {
  asset: DatabaseAssetSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateAssetModal({ asset, isOpen, onClose, onSuccess }: Props) {
  const [provider, setProvider] = useState<'yahoo' | 'coingecko' | 'dexscreener'>('yahoo');
  const [identifier, setIdentifier] = useState<string>('');
  const [chain, setChain] = useState<string>('pulsechain');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    success?: boolean;
    message?: string;
    count?: number;
  } | null>(null);

  // Initialize or reset defaults when modal opens or asset changes
  useEffect(() => {
    if (!isOpen) return;

    setStatus(null);
    const sym = asset.symbol.toUpperCase();
    const mapping = ASSET_PROVIDER_MAPPINGS[sym];

    // Default provider based on asset characteristics
    let defaultProv: 'yahoo' | 'coingecko' | 'dexscreener' = 'yahoo';
    if (sym === 'PLS' || sym === 'PLSX') {
      defaultProv = 'dexscreener';
    }
    setProvider(defaultProv);

    // Initial identifier
    if (defaultProv === 'yahoo') {
      setIdentifier(mapping?.yahoo || (sym === 'GOLD' ? 'GC=F' : `${sym}-USD`));
    } else if (defaultProv === 'dexscreener') {
      setIdentifier(mapping?.dexscreener?.address || '');
      setChain(mapping?.dexscreener?.chain || asset.chain || 'pulsechain');
    } else {
      setIdentifier(mapping?.coingecko || sym.toLowerCase());
    }

    // Default date range: if asset has endDate, default start from that date, otherwise 2023-01-01
    const today = new Date().toISOString().slice(0, 10);
    setEndDate(today);
    if (asset.endDate) {
      setStartDate(asset.endDate);
    } else {
      setStartDate('2023-01-01');
    }
  }, [isOpen, asset]);

  // When user switches provider, update the identifier placeholder/value to recommended defaults
  const handleProviderChange = (newProvider: 'yahoo' | 'coingecko' | 'dexscreener') => {
    setProvider(newProvider);
    setStatus(null);
    const sym = asset.symbol.toUpperCase();
    const mapping = ASSET_PROVIDER_MAPPINGS[sym];

    if (newProvider === 'yahoo') {
      setIdentifier(mapping?.yahoo || (sym === 'GOLD' ? 'GC=F' : `${sym}-USD`));
    } else if (newProvider === 'coingecko') {
      setIdentifier(mapping?.coingecko || sym.toLowerCase());
    } else if (newProvider === 'dexscreener') {
      setIdentifier(mapping?.dexscreener?.address || '');
      setChain(mapping?.dexscreener?.chain || asset.chain || 'pulsechain');
    }
  };

  // Quick preset helpers
  const applyPreset = (preset: 'since-sync' | '30d' | '90d' | '1y' | '2021' | '2023') => {
    const today = new Date().toISOString().slice(0, 10);
    setEndDate(today);

    const now = new Date();
    if (preset === 'since-sync') {
      setStartDate(asset.endDate || '2023-01-01');
    } else if (preset === '30d') {
      now.setDate(now.getDate() - 30);
      setStartDate(now.toISOString().slice(0, 10));
    } else if (preset === '90d') {
      now.setDate(now.getDate() - 90);
      setStartDate(now.toISOString().slice(0, 10));
    } else if (preset === '1y') {
      now.setFullYear(now.getFullYear() - 1);
      setStartDate(now.toISOString().slice(0, 10));
    } else if (preset === '2021') {
      setStartDate('2021-01-01');
    } else if (preset === '2023') {
      setStartDate('2023-01-01');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await updateAssetDataAction({
      symbol: asset.symbol,
      provider,
      identifier: identifier.trim(),
      chain: provider === 'dexscreener' ? chain : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    setLoading(false);
    setStatus({
      success: res.success,
      message: res.message,
      count: res.count,
    });

    if (res.success) {
      onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: `${asset.color}20`,
                borderColor: `${asset.color}40`,
                borderWidth: '1px',
                color: asset.color,
              }}
            >
              {asset.symbol}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Update Historical Data:</span>
                <span className="text-amber-300 font-mono">{asset.symbol}</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                {asset.name} • {asset.totalRecords} candles in database
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Currently stored range summary */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Current Stored Range:</span>
            </div>
            <div className="text-amber-300 font-semibold">
              {asset.startDate && asset.endDate ? (
                `${asset.startDate} → ${asset.endDate}`
              ) : (
                <span className="text-slate-500 italic">No records yet</span>
              )}
            </div>
          </div>

          {/* Provider Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Select Data Source Provider</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Yahoo Finance */}
              <button
                type="button"
                onClick={() => handleProviderChange('yahoo')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  provider === 'yahoo'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-bold font-mono">Yahoo Finance</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Ticker Quotes</span>
              </button>

              {/* CoinGecko */}
              <button
                type="button"
                onClick={() => handleProviderChange('coingecko')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  provider === 'coingecko'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-bold font-mono">CoinGecko</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Coin ID API</span>
              </button>

              {/* DexScreener */}
              <button
                type="button"
                onClick={() => handleProviderChange('dexscreener')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  provider === 'dexscreener'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-semibold shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-bold font-mono">DexScreener</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Pair Contract</span>
              </button>
            </div>
          </div>

          {/* Identifier / Ticker Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="source-identifier-input" className="text-xs font-semibold text-slate-300">
                {provider === 'yahoo'
                  ? 'Yahoo Ticker'
                  : provider === 'dexscreener'
                  ? 'Smart Contract Pair Address'
                  : 'CoinGecko Coin ID'}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {provider === 'yahoo'
                  ? 'e.g. BTC-USD, GC=F, PLS-USD'
                  : provider === 'dexscreener'
                  ? '0x... on chain'
                  : 'e.g. bitcoin, pulsechain, hex'}
              </span>
            </div>

            <input
              id="source-identifier-input"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                provider === 'yahoo'
                  ? 'BTC-USD or GC=F'
                  : provider === 'dexscreener'
                  ? '0xE56043671df55dE5CDf8459710433C10324DE0aE'
                  : 'bitcoin'
              }
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition"
            />

            {/* Provider Notes Note */}
            <div className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-1 font-mono leading-relaxed">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>
                {provider === 'yahoo' && (
                  <>
                    Yahoo uses tickers: <strong className="text-slate-200">GC=F</strong> (gold), <strong className="text-slate-200">BTC-USD</strong>, <strong className="text-slate-200">SOL-USD</strong>, <strong className="text-slate-200">ETH-USD</strong>, <strong className="text-slate-200">PLS-USD</strong>, <strong className="text-slate-200">PLSX-USD</strong>, <strong className="text-slate-200">HEX-USD</strong>.
                  </>
                )}
                {provider === 'dexscreener' && (
                  <>
                    DexScreener uses the on-chain smart contract address for DEX liquidity pairs.
                  </>
                )}
                {provider === 'coingecko' && (
                  <>
                    CoinGecko uses standard coin identifiers: <strong className="text-slate-200">bitcoin</strong>, <strong className="text-slate-200">ethereum</strong>, <strong className="text-slate-200">solana</strong>, <strong className="text-slate-200">pulsechain</strong>, <strong className="text-slate-200">pulsex</strong>, <strong className="text-slate-200">hex</strong>.
                  </>
                )}
              </span>
            </div>
          </div>

          {/* DexScreener Chain Selector */}
          {provider === 'dexscreener' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dex-chain-input" className="text-xs font-semibold text-slate-300">
                Blockchain Network
              </label>
              <select
                id="dex-chain-input"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="pulsechain">PulseChain</option>
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
                <option value="bsc">BNB Smart Chain</option>
              </select>
            </div>
          )}

          {/* Date Range Selection */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Date Range to Synchronize</span>
              </label>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {asset.endDate && (
                <button
                  type="button"
                  onClick={() => applyPreset('since-sync')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] font-mono font-medium transition"
                  title={`Since last sync: ${asset.endDate} to today`}
                >
                  Since Last Sync ({asset.endDate})
                </button>
              )}
              <button
                type="button"
                onClick={() => applyPreset('30d')}
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition"
              >
                Last 30D
              </button>
              <button
                type="button"
                onClick={() => applyPreset('90d')}
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition"
              >
                Last 90D
              </button>
              <button
                type="button"
                onClick={() => applyPreset('1y')}
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition"
              >
                Last 1Y
              </button>
              <button
                type="button"
                onClick={() => applyPreset('2021')}
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition"
              >
                From 2021
              </button>
              <button
                type="button"
                onClick={() => applyPreset('2023')}
                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition"
              >
                From 2023
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 text-[11px] font-semibold">Start Date:</span>
                  <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                    YYYY-MM-DD
                  </span>
                </div>
                <IsoDateInput
                  id="modal-start-date"
                  value={startDate}
                  max={endDate}
                  onChange={(val) => setStartDate(val)}
                  focusColor="amber"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 text-[11px] font-semibold">End Date:</span>
                  <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                    YYYY-MM-DD
                  </span>
                </div>
                <IsoDateInput
                  id="modal-end-date"
                  value={endDate}
                  min={startDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(val) => setEndDate(val)}
                  focusColor="amber"
                  required
                />
              </div>
            </div>

            {/* Locale / Format Helper Note */}
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between px-1">
              <span>Format: <strong className="text-amber-400">YYYY-MM-DD</strong> (Year-Month-Day)</span>
              <span className="text-slate-500">Click 📅 to pick from calendar</span>
            </div>
          </div>

          {/* Status Banners */}
          {status && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs font-mono animate-in fade-in duration-200 ${
                status.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
              }`}
            >
              {status.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{status.message}</span>
            </div>
          )}

          {/* Submit / Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>

            <button
              id="confirm-update-asset-btn"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Retrieving & Updating DB...' : 'Start Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
