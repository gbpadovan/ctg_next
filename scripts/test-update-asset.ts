import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { syncAssetFromProvider } from '../src/lib/data/sync-asset';

async function testUpdates() {
  console.log('--- Testing Asset Update Engine ---');

  // 1. Test Yahoo Finance update for BTC
  console.log('1. Testing Yahoo Finance update for BTC (BTC-USD)...');
  const yahooRes = await syncAssetFromProvider({
    symbol: 'BTC',
    provider: 'yahoo',
    identifier: 'BTC-USD',
    startDate: '2026-10-01',
    endDate: '2026-10-08',
  });
  console.log('Yahoo BTC result:', yahooRes);

  // 2. Test CoinGecko update for ETH
  console.log('2. Testing CoinGecko update for ETH (ethereum)...');
  const cgRes = await syncAssetFromProvider({
    symbol: 'ETH',
    provider: 'coingecko',
    identifier: 'ethereum',
    startDate: '2026-10-01',
    endDate: '2026-10-08',
  });
  console.log('CoinGecko ETH result:', cgRes);

  // 3. Test DexScreener update for PLS
  console.log('3. Testing DexScreener update for PLS...');
  const dexRes = await syncAssetFromProvider({
    symbol: 'PLS',
    provider: 'dexscreener',
    identifier: '0xE56043671df55dE5CDf8459710433C10324DE0aE',
    chain: 'pulsechain',
  });
  console.log('DexScreener PLS result:', dexRes);

  console.log('--- ALL TEST RUNS COMPLETE ---');
}

testUpdates().catch(console.error);
