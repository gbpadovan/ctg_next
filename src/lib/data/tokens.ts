export interface TokenDefinition {
  symbol: string;
  name: string;
  sourceType: 'yahoo' | 'dexscreener' | 'coingecko';
  sourceIdentifier: string;
  chain?: string;
  quoteToken: string;
  color: string;
  decimals?: number;
}

export const SUPPORTED_TOKENS: TokenDefinition[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    sourceType: 'yahoo',
    sourceIdentifier: 'BTC-USD',
    quoteToken: 'USD',
    color: '#f7931a',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    sourceType: 'yahoo',
    sourceIdentifier: 'ETH-USD',
    quoteToken: 'USD',
    color: '#627eea',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    sourceType: 'yahoo',
    sourceIdentifier: 'SOL-USD',
    quoteToken: 'USD',
    color: '#14f195',
  },
  {
    symbol: 'PLS',
    name: 'PulseChain',
    sourceType: 'dexscreener',
    sourceIdentifier: '0xE56043671df55dE5CDf8459710433C10324DE0aE',
    chain: 'pulsechain',
    quoteToken: 'DAI',
    color: '#00e5ff',
  },
  {
    symbol: 'PLSX',
    name: 'PulseX',
    sourceType: 'dexscreener',
    sourceIdentifier: '0xb2893cea8080bf43b7b60b589edaab5211d98f23',
    chain: 'pulsechain',
    quoteToken: 'DAI',
    color: '#9945ff',
  },
];
