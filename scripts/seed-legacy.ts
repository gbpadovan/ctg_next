import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getDb, schema } from '../src/db';
import { fetchGoldHistorical } from '../src/lib/data/gold';
import { SUPPORTED_TOKENS } from '../src/lib/data/tokens';
import { CTGDataService } from '../src/lib/data/service';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('--- Starting CTG Neon Legacy Seed Script ---');
  const db = getDb();

  if (!db) {
    console.error('Error: DATABASE_URL is not set or invalid in .env.local.');
    console.log('Please provide a valid Neon PostgreSQL connection string to run seed migrations.');
    process.exit(1);
  }

  console.log('Connected to Neon Database. Initializing seed data...');

  // 1. Seed Tokens
  console.log('1. Seeding Tokens...');
  for (const token of SUPPORTED_TOKENS) {
    const existing = await db.query.tokens.findFirst({
      where: eq(schema.tokens.symbol, token.symbol),
    });

    if (!existing) {
      console.log(`Inserting token: ${token.symbol} (${token.name})`);
      await db.insert(schema.tokens).values({
        symbol: token.symbol,
        name: token.name,
        sourceType: token.sourceType,
        sourceIdentifier: token.sourceIdentifier,
        chain: token.chain,
        quoteToken: token.quoteToken,
      });
    } else {
      console.log(`Token ${token.symbol} already exists.`);
    }
  }

  // 2. Seed Gold Historical Prices
  console.log('2. Backfilling Gold Prices from Yahoo Finance (GC=F)...');
  const goldPoints = await fetchGoldHistorical('2023-01-01');
  console.log(`Fetched ${goldPoints.length} gold candles.`);

  let goldCount = 0;
  for (const g of goldPoints) {
    await db
      .insert(schema.goldPrices)
      .values({
        date: g.date,
        open: g.open.toString(),
        high: g.high.toString(),
        low: g.low.toString(),
        close: g.close.toString(),
        volume: g.volume ? g.volume.toString() : '0',
      })
      .onConflictDoUpdate({
        target: schema.goldPrices.date,
        set: {
          open: g.open.toString(),
          high: g.high.toString(),
          low: g.low.toString(),
          close: g.close.toString(),
          volume: g.volume ? g.volume.toString() : '0',
        },
      });
    goldCount++;
  }
  console.log(`Successfully seeded ${goldCount} gold candles.`);

  // 3. Seed PulseChain and PulseX from legacy JSON files
  console.log('3. Seeding legacy PulseChain and PulseX data...');
  const legacyFiles = [
    { symbol: 'PLS', file: 'pulsechain.json' },
    { symbol: 'PLSX', file: 'pulsex.json' },
  ];

  for (const item of legacyFiles) {
    const tokenRec = await db.query.tokens.findFirst({
      where: eq(schema.tokens.symbol, item.symbol),
    });

    if (!tokenRec) continue;

    const filePath = path.join(process.cwd(), 'legacy_data', item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Inserting ${data.length} records for ${item.symbol}...`);

    for (const row of data) {
      const close = parseFloat(row.close);
      await db
        .insert(schema.tokenPrices)
        .values({
          tokenId: tokenRec.id,
          date: row.date,
          open: close.toString(),
          high: close.toString(),
          low: close.toString(),
          close: close.toString(),
          volume: row.volume ? row.volume.toString() : '0',
          marketCap: row.mktcap ? row.mktcap.toString() : null,
        })
        .onConflictDoUpdate({
          target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
          set: {
            close: close.toString(),
            volume: row.volume ? row.volume.toString() : '0',
            marketCap: row.mktcap ? row.mktcap.toString() : null,
          },
        });
    }
    console.log(`Seeded ${item.symbol}.`);
  }

  // 4. Seed Yahoo Cryptos (BTC, ETH, SOL)
  console.log('4. Backfilling Yahoo Cryptos (BTC, ETH, SOL)...');
  for (const sym of ['BTC', 'ETH', 'SOL']) {
    const tokenDef = SUPPORTED_TOKENS.find((t) => t.symbol === sym);
    if (!tokenDef) continue;

    const tokenRec = await db.query.tokens.findFirst({
      where: eq(schema.tokens.symbol, sym),
    });
    if (!tokenRec) continue;

    const prices = await CTGDataService.getTokenHistory(tokenDef, '2023-01-01');
    console.log(`Inserting ${prices.length} candles for ${sym}...`);

    for (const pt of prices) {
      await db
        .insert(schema.tokenPrices)
        .values({
          tokenId: tokenRec.id,
          date: pt.date,
          open: pt.open.toString(),
          high: pt.high.toString(),
          low: pt.low.toString(),
          close: pt.close.toString(),
          volume: pt.volume ? pt.volume.toString() : '0',
        })
        .onConflictDoUpdate({
          target: [schema.tokenPrices.tokenId, schema.tokenPrices.date],
          set: {
            open: pt.open.toString(),
            high: pt.high.toString(),
            low: pt.low.toString(),
            close: pt.close.toString(),
            volume: pt.volume ? pt.volume.toString() : '0',
          },
        });
    }
  }

  console.log('--- Migration & Seed completed successfully! ---');
}

main().catch((err) => {
  console.error('Seed script encountered an error:', err);
  process.exit(1);
});
