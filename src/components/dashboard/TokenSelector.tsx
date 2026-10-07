'use client';

import React from 'react';
import { TokenDefinition } from '@/lib/data/tokens';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  tokens: TokenDefinition[];
  selectedSymbol: string;
  onSelectToken: (symbol: string) => void;
}

export const TokenSelector: React.FC<Props> = ({
  tokens,
  selectedSymbol,
  onSelectToken,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
      {tokens.map((token) => {
        const isSelected = token.symbol.toUpperCase() === selectedSymbol.toUpperCase();

        return (
          <button
            key={token.symbol}
            onClick={() => onSelectToken(token.symbol)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap ${
              isSelected
                ? 'bg-slate-800 border-blue-500/60 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 hover:border-slate-700'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
              style={{ backgroundColor: token.color }}
            />
            <span className="font-bold tracking-tight text-slate-100">{token.symbol}</span>
            <span className="text-xs text-slate-400 font-normal">{token.name}</span>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                token.sourceType === 'dexscreener'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {token.sourceType === 'dexscreener' ? 'DEX' : 'YF'}
            </span>
          </button>
        );
      })}
    </div>
  );
};
