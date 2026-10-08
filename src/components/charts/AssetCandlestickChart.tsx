'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import { AssetCandle } from '@/lib/data/assets';
import { Maximize2, Minimize2, Eye, TrendingUp, BarChart2 } from 'lucide-react';

interface Props {
  candles: AssetCandle[];
  symbol: string;
  name: string;
  quoteToken: string;
}

export const AssetCandlestickChart: React.FC<Props> = ({
  candles,
  symbol,
  name,
  quoteToken,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<AssetCandle | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;

    // Deduplicate and sort candles by time ascending
    const candleMap = new Map<string, AssetCandle>();
    candles.forEach((c) => {
      if (c.time && !isNaN(c.close)) {
        candleMap.set(c.time, c);
      }
    });

    const sortedCandles = Array.from(candleMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    if (sortedCandles.length === 0) return;

    // Create chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: isFullscreen ? window.innerHeight - 180 : 540,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      crosshair: {
        vertLine: {
          color: '#fbbf24',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#fbbf24',
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
    });

    chartInstanceRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      title: `${symbol}/${quoteToken}`,
    });

    candleSeries.setData(
      sortedCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // 2. Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeries.setData(
      sortedCandles.map((c) => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
      }))
    );

    // Default hover to the most recent candle
    setHoveredCandle(sortedCandles[sortedCandles.length - 1]);

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredCandle(sortedCandles[sortedCandles.length - 1]);
        return;
      }

      const match = sortedCandles.find((c) => c.time === param.time);
      if (match) {
        setHoveredCandle(match);
      }
    });

    chart.timeScale().fitContent();

    // Handle responsive resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 180 : 540,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [candles, isFullscreen, symbol, quoteToken]);

  const activeCandle = hoveredCandle || candles[candles.length - 1];
  const isUp = activeCandle ? activeCandle.close >= activeCandle.open : true;
  const candleChange =
    activeCandle && activeCandle.open > 0
      ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100
      : 0;

  return (
    <div
      className={`w-full flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 bg-[#070a12]/95 border-amber-500/30' : ''
      }`}
    >
      {/* Top Legend Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{symbol}</span>
            <span className="text-slate-400 text-xs">/ {quoteToken}</span>
          </div>

          {activeCandle && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{activeCandle.time}</span>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">O:</span>
                <span className="text-slate-200">
                  ${activeCandle.open >= 1 ? activeCandle.open.toFixed(2) : activeCandle.open.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">H:</span>
                <span className="text-emerald-400">
                  ${activeCandle.high >= 1 ? activeCandle.high.toFixed(2) : activeCandle.high.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">L:</span>
                <span className="text-rose-400">
                  ${activeCandle.low >= 1 ? activeCandle.low.toFixed(2) : activeCandle.low.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">C:</span>
                <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${activeCandle.close >= 1 ? activeCandle.close.toFixed(2) : activeCandle.close.toFixed(6)}
                </span>
              </div>
              <span className={`text-[11px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({isUp ? '+' : ''}{candleChange.toFixed(2)}%)
              </span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={chartContainerRef}
        className={`w-full relative ${isFullscreen ? 'h-[calc(100vh-250px)]' : 'h-[540px]'}`}
      />

      {/* Footer Info */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950/80 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>TradingView Lightweight Charts v5</span>
          <span>•</span>
          <span>OHLCV Candlesticks & Volume</span>
        </div>
        <div>
          <span>{candles.length} bars displayed</span>
        </div>
      </div>
    </div>
  );
};
