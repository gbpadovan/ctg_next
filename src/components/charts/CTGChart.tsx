'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  SeriesMarker,
  IChartApi,
} from 'lightweight-charts';
import { CTGDataPoint } from '@/lib/indicators/ctg';
import { Maximize2, Minimize2, Eye, TrendingUp, Layers, Clock, RotateCcw, RefreshCw } from 'lucide-react';
import { IsoDateInput } from '@/components/ui/IsoDateInput';

interface Props {
  data: CTGDataPoint[];
  tokenSymbol: string;
  tokenName?: string;
  onRefreshLatest?: () => void;
  isRefreshing?: boolean;
}

export const CTGChart: React.FC<Props> = ({
  data,
  tokenSymbol,
  tokenName,
  onRefreshLatest,
  isRefreshing,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [viewMode, setViewMode] = useState<'ratio_roc' | 'candlestick'>('ratio_roc');
  const [hoveredPoint, setHoveredPoint] = useState<CTGDataPoint | null>(null);

  // Available data date boundary
  const minDate = useMemo(() => {
    return data && data.length > 0 ? data[0].date : '2021-01-01';
  }, [data]);

  const maxDate = useMemo(() => {
    return data && data.length > 0 ? data[data.length - 1].date : new Date().toISOString().slice(0, 10);
  }, [data]);

  // Date Range Filtering state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('ALL');

  // Handle Preset selection
  const applyPreset = (preset: string, latestDate?: string, earliestDate?: string) => {
    setActivePreset(preset);
    const end = latestDate || maxDate || new Date().toISOString().slice(0, 10);
    const min = earliestDate || minDate || '2021-01-01';
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
      setStartDate(min);
      return;
    }

    const startStr = startD.toISOString().slice(0, 10);
    setStartDate(startStr < min ? min : startStr);
  };

  // Sync date bounds when data or token changes
  useEffect(() => {
    if (data && data.length > 0) {
      if (activePreset === 'ALL' || !startDate || !endDate) {
        setStartDate(data[0].date);
        setEndDate(data[data.length - 1].date);
        setActivePreset('ALL');
      } else if (activePreset !== 'CUSTOM') {
        applyPreset(activePreset, data[data.length - 1].date, data[0].date);
      }
    }
  }, [data]);

  const handleResetFilter = () => {
    setActivePreset('ALL');
    setStartDate(minDate);
    setEndDate(maxDate);
  };

  // Filter data points by current date range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!startDate && !endDate) return data;
    return data.filter((d) => {
      if (startDate && d.date < startDate) return false;
      if (endDate && d.date > endDate) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  useEffect(() => {
    if (!chartContainerRef.current || !filteredData || filteredData.length === 0) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;

    // Filter and ensure chronological sorting
    const cleanData = filteredData
      .filter((d) => d.date && !isNaN(d.ratio) && !isNaN(d.token.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (cleanData.length === 0) return;

    // Deduplicate by date (TradingView requires strictly increasing times)
    const uniqueMap = new Map<string, CTGDataPoint>();
    cleanData.forEach((d) => uniqueMap.set(d.date, d));
    const sortedData = Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Initialize Chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: '#0b0f19' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.6)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.6)' },
      },
      crosshair: {
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
    });

    chartInstanceRef.current = chart;

    if (viewMode === 'candlestick') {
      // Candlestick View (Token Candles + Gold Secondary Scale)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
        title: `${tokenSymbol} USD`,
      });

      candleSeries.setData(
        sortedData.map((d) => ({
          time: d.date,
          open: d.token.open,
          high: d.token.high,
          low: d.token.low,
          close: d.token.close,
        }))
      );

      // Gold comparison line on Left Price Scale
      const goldSeries = chart.addSeries(
        LineSeries,
        {
          color: '#eab308',
          lineWidth: 2,
          title: 'Gold USD (GC=F)',
          priceScaleId: 'left',
        }
      );

      chart.priceScale('left').applyOptions({
        visible: true,
        borderColor: '#1e293b',
      });

      goldSeries.setData(
        sortedData.map((d) => ({
          time: d.date,
          value: d.gold.close,
        }))
      );
    } else {
      // CTG Ratio & ROC 2-Pane Oscillator View
      // Pane 0: Ratio Line
      const ratioSeries = chart.addSeries(
        LineSeries,
        {
          color: '#f59e0b',
          lineWidth: 2,
          title: `${tokenSymbol}/Gold Ratio`,
        },
        0
      );

      ratioSeries.setData(
        sortedData.map((d) => ({
          time: d.date,
          value: d.ratio,
        }))
      );

      // Pane 1: 4W ROC Oscillator
      const rocSeries = chart.addSeries(
        LineSeries,
        {
          color: '#3b82f6',
          lineWidth: 2,
          title: '4-Week ROC (%)',
        },
        1
      );

      rocSeries.setData(
        sortedData.map((d) => ({
          time: d.date,
          value: d.rocP4,
        }))
      );

      // Zero-Line reference on Pane 1
      rocSeries.createPriceLine({
        price: 0,
        color: '#64748b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '0.00%',
      });

      // Buy & Sell markers on ROC series
      const markers: SeriesMarker<string>[] = [];
      sortedData.forEach((d) => {
        if (d.signal === 'buy') {
          markers.push({
            time: d.date,
            position: 'belowBar',
            color: '#10b981',
            shape: 'arrowUp',
            text: 'BUY',
          });
        } else if (d.signal === 'sell') {
          markers.push({
            time: d.date,
            position: 'aboveBar',
            color: '#ef4444',
            shape: 'arrowDown',
            text: 'SELL',
          });
        }
      });

      if (markers.length > 0) {
        createSeriesMarkers(rocSeries, markers);
      }
    }

    // Subscribe to crosshair move for real-time inspector HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHoveredPoint(null);
        return;
      }
      const timeStr = typeof param.time === 'string' ? param.time : '';
      const pt = sortedData.find((d) => d.date === timeStr);
      setHoveredPoint(pt || null);
    });

    chart.timeScale().fitContent();

    // Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartInstanceRef.current) return;
      const { width } = entries[0].contentRect;
      chartInstanceRef.current.applyOptions({ width });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [filteredData, tokenSymbol, viewMode]);

  const activePoint = hoveredPoint || (filteredData.length > 0 ? filteredData[filteredData.length - 1] : null);

  const formatNumber = (num: number, maxDecimals: number = 4) => {
    if (num === 0) return '0.00';
    if (Math.abs(num) < 0.0001) {
      return num.toExponential(3);
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });
  };

  return (
    <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
      {/* Chart Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>{tokenName ? `${tokenName} (${tokenSymbol})` : tokenSymbol}</span>
              <span className="text-xs text-slate-400 font-normal">/</span>
              <span className="text-amber-400">Gold (GC=F)</span>
            </h3>
            <p className="text-xs text-slate-400">
              {viewMode === 'ratio_roc'
                ? 'Dual Pane: Ratio & 4W ROC Oscillator with Buy/Sell Crossover Signals'
                : 'Direct Price Action: Japanese Candlesticks with Gold Secondary Scale'}
            </p>
          </div>
        </div>

        {/* Controls: Refresh Yahoo & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRefreshLatest && (
            <button
              id="chart-refresh-yahoo-btn"
              type="button"
              onClick={onRefreshLatest}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-mono font-medium transition shadow-sm hover:shadow-amber-500/10 disabled:opacity-50"
              title={`Fetch latest live prices for ${tokenSymbol} and Gold from Yahoo Finance, save to database, and update CTG`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? 'animate-spin text-amber-400' : 'text-amber-400'
                }`}
              />
              <span>{isRefreshing ? 'Updating...' : 'Refresh Yahoo'}</span>
            </button>
          )}

          {/* View Switcher Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('ratio_roc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'ratio_roc'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>CTG Oscillator & Signals</span>
            </button>
            <button
              onClick={() => setViewMode('candlestick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'candlestick'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Candlestick Overlay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Controls Bar (Matching /assets/[asset] style) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/70">
        {/* Quick Range Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Intervals:
          </span>
          {['1M', '3M', '6M', '1Y', 'ALL'].map((preset) => (
            <button
              key={preset}
              id={`ctg-preset-${preset.toLowerCase()}-btn`}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition ${
                activePreset === preset
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <label htmlFor="ctg-start-date" className="text-slate-300 flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">Start:</span>
              <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                YYYY-MM-DD
              </span>
            </label>
            <div className="w-36">
              <IsoDateInput
                id="ctg-start-date"
                value={startDate}
                min={minDate}
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
            <label htmlFor="ctg-end-date" className="text-slate-300 flex items-center gap-1.5">
              <span className="font-semibold text-slate-300">End:</span>
              <span className="text-amber-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 font-semibold">
                YYYY-MM-DD
              </span>
            </label>
            <div className="w-36">
              <IsoDateInput
                id="ctg-end-date"
                value={endDate}
                min={startDate}
                max={maxDate}
                onChange={(val) => {
                  setActivePreset('CUSTOM');
                  setEndDate(val);
                }}
                focusColor="blue"
              />
            </div>
          </div>

          <button
            id="ctg-reset-date-btn"
            onClick={handleResetFilter}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Reset date filter to ALL"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Crosshair Inspector Bar */}
      {activePoint && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/70 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Date</span>
            <span className="text-slate-200 font-medium font-mono">{activePoint.date}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">{tokenSymbol} Price</span>
            <span className="text-emerald-400 font-mono font-medium">${formatNumber(activePoint.token.close)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Gold Spot (oz)</span>
            <span className="text-amber-400 font-mono font-medium">${formatNumber(activePoint.gold.close, 2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Ratio</span>
            <span className="text-cyan-400 font-mono font-medium">{formatNumber(activePoint.ratio, 6)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">4W ROC</span>
            <span
              className={`font-mono font-semibold ${
                activePoint.rocP4 >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activePoint.rocP4 >= 0 ? '+' : ''}
              {activePoint.rocP4.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Canvas Chart Container */}
      {filteredData.length === 0 ? (
        <div className="w-full h-[560px] rounded-xl flex items-center justify-center border border-slate-800/80 bg-[#0b0f19] text-slate-400 font-mono text-xs">
          No data points found for {startDate} to {endDate}.
        </div>
      ) : (
        <div
          ref={chartContainerRef}
          className="w-full h-[560px] rounded-xl overflow-hidden border border-slate-800/80 bg-[#0b0f19] relative"
        />
      )}
    </div>
  );
};
