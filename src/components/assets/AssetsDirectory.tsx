'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DatabaseAssetSummary } from '@/lib/data/assets';
import { fetchDatabaseAssetsAction } from '@/app/actions/assets';
import { UpdateAssetModal } from './UpdateAssetModal';
import {
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Coins,
  Search,
  Database,
  Clock,
  Sparkles,
  BarChart2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface Props {
  initialAssets: DatabaseAssetSummary[];
}

export function AssetsDirectory({ initialAssets }: Props) {
  const [assetsList, setAssetsList] = useState<DatabaseAssetSummary[]>(initialAssets);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'crypto' | 'commodity'>('all');
  const [selectedAssetForUpdate, setSelectedAssetForUpdate] = useState<DatabaseAssetSummary | null>(null);

  const handleRefresh = async () => {
    const res = await fetchDatabaseAssetsAction();
    if (res.success && res.data) {
      setAssetsList(res.data);
    }
  };

  const filteredAssets = assetsList.filter((asset) => {
    const matchesSearch =
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || asset.category === filter;
    return matchesSearch && matchesFilter;
  });

  const totalDataPoints = assetsList.reduce(
    (sum, a) => sum + (a.totalRecords || 0),
    0
  );

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 px-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl tracking-tight">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Database Assets Directory
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Neon Postgres
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Historical OHLCV price series archived in database with verifiable chronological date ranges
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono font-medium">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Assets:</span>
            <span className="font-bold text-blue-200">{assetsList.length}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Points:</span>
            <span className="font-bold text-emerald-200">
              {totalDataPoints.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by asset symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition font-mono"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({assetsList.length})
          </button>
          <button
            onClick={() => setFilter('crypto')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === 'crypto'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Crypto ({assetsList.filter((a) => a.category === 'crypto').length})
          </button>
          <button
            onClick={() => setFilter('commodity')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === 'commodity'
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Commodities ({assetsList.filter((a) => a.category === 'commodity').length})
          </button>
        </div>
      </div>

      {/* 3. Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAssets.map((asset) => {
          const formattedPrice =
            asset.latestPrice !== null
              ? asset.latestPrice >= 1
                ? `$${asset.latestPrice.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : `$${asset.latestPrice.toFixed(6)}`
              : 'N/A';

          return (
            <Link
              key={asset.symbol}
              id={`asset-card-${asset.symbol.toLowerCase()}`}
              href={`/assets/${asset.symbol}`}
              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-black/50"
            >
              {/* Card Accent Top Bar */}
              <div
                className="absolute top-0 left-6 right-6 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: asset.color }}
              />

              <div className="flex flex-col gap-4">
                {/* Header: Asset Badge + Name + Tag */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm tracking-tight text-white shadow-md shrink-0"
                      style={{
                        backgroundColor: `${asset.color}25`,
                        borderColor: `${asset.color}40`,
                        borderWidth: '1px',
                        color: asset.color,
                      }}
                    >
                      {asset.symbol}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-100 text-sm truncate group-hover:text-white transition-colors">
                        {asset.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {asset.symbol} / {asset.quoteToken}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded-full bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
                    {asset.chain ? asset.chain : asset.category}
                  </span>
                </div>

                {/* Metrics: Time Range + Record Count */}
                <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs">
                  {/* Time Range */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      Historical Time Range
                    </span>
                    <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      {asset.startDate && asset.endDate ? (
                        <>
                          <span className="text-amber-300">{asset.startDate}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-amber-300">{asset.endDate}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 italic">No historical records</span>
                      )}
                    </div>
                  </div>

                  {/* Daily Candles & Latest Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{asset.totalRecords.toLocaleString()} candles</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-100 font-bold font-mono">
                        {formattedPrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer: Update Button + Candlestick Link */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                {/* Update Button */}
                <button
                  id={`update-btn-${asset.symbol.toLowerCase()}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedAssetForUpdate(asset);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-all font-mono text-[11px] shadow-sm z-10 active:scale-95"
                  title={`Update historical data for ${asset.symbol}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Update</span>
                </button>

                <div className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span>Candlestick Chart</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 border border-slate-800 rounded-2xl gap-3">
          <Database className="w-10 h-10 text-slate-600" />
          <span className="text-slate-300 font-semibold text-sm">
            No assets match &ldquo;{search}&rdquo;
          </span>
          <span className="text-xs text-slate-500">
            Try adjusting your search query or switching categories.
          </span>
        </div>
      )}

      {/* Pop-up Window / Modal */}
      {selectedAssetForUpdate && (
        <UpdateAssetModal
          asset={selectedAssetForUpdate}
          isOpen={!!selectedAssetForUpdate}
          onClose={() => setSelectedAssetForUpdate(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
