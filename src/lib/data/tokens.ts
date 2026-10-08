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
  {
    symbol: 'HEX',
    name: 'HEX',
    sourceType: 'yahoo',
    sourceIdentifier: 'HEX-USD',
    chain: 'ethereum',
    quoteToken: 'USD',
    color: '#ff007a',
  },
];

export interface AssetProviderDefaults {
  yahoo: string;
  coingecko: string;
  dexscreener?: {
    chain: string;
    address: string;
  };
}

export const ASSET_PROVIDER_MAPPINGS: Record<string, AssetProviderDefaults> = {
  GOLD: {
    yahoo: 'GC=F',
    coingecko: 'pax-gold',
  },
  BTC: {
    yahoo: 'BTC-USD',
    coingecko: 'bitcoin',
    dexscreener: {
      chain: 'ethereum',
      address: '0xCBCdBF3B82bCD958718b5d1B8284caec85ACe75b',
    },
  },
  ETH: {
    yahoo: 'ETH-USD',
    coingecko: 'ethereum',
    dexscreener: {
      chain: 'ethereum',
      address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    },
  },
  SOL: {
    yahoo: 'SOL-USD',
    coingecko: 'solana',
    dexscreener: {
      chain: 'solana',
      address: 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
    },
  },
  PLS: {
    yahoo: 'PLS-USD',
    coingecko: 'pulsechain',
    dexscreener: {
      chain: 'pulsechain',
      address: '0xE56043671df55dE5CDf8459710433C10324DE0aE',
    },
  },
  PLSX: {
    yahoo: 'PLSX-USD',
    coingecko: 'pulsex',
    dexscreener: {
      chain: 'pulsechain',
      address: '0xb2893cea8080bf43b7b60b589edaab5211d98f23',
    },
  },
  HEX: {
    yahoo: 'HEX-USD',
    coingecko: 'hex',
    dexscreener: {
      chain: 'ethereum',
      address: '0x55d8b1dd2b43b2248c0c2ece84941b993b773c69',
    },
  },
};
