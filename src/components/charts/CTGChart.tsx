'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { Maximize2, Minimize2, Eye, TrendingUp, Layers } from 'lucide-react';

interface Props {
  data: CTGDataPoint[];
  tokenSymbol: string;
  tokenName?: string;
}

export const CTGChart: React.FC<Props> = ({ data, tokenSymbol, tokenName }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [viewMode, setViewMode] = useState<'ratio_roc' | 'candlestick'>('ratio_roc');
  const [hoveredPoint, setHoveredPoint] = useState<CTGDataPoint | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;

    // Filter and ensure chronological sorting
    const cleanData = data
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
  }, [data, tokenSymbol, viewMode]);

  const activePoint = hoveredPoint || (data.length > 0 ? data[data.length - 1] : null);

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

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
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
      <div
        ref={chartContainerRef}
        className="w-full h-[560px] rounded-xl overflow-hidden border border-slate-800/80 bg-[#0b0f19] relative"
      />
    </div>
  );
};
