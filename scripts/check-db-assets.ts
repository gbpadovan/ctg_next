import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from '../src/db';
import { tokens, tokenPrices, goldPrices } from '../src/db/schema';
import { sql, eq } from 'drizzle-orm';

async function main() {
  const db = getDb();
  if (!db) {
    console.log('No DB connection.');
    return;
  }

  const tokenList = await db.select().from(tokens);
  console.log('Tokens in DB count:', tokenList.length);
  for (const t of tokenList) {
    const [range] = await db
      .select({
        minDate: sql<string>`min(date)`,
        maxDate: sql<string>`max(date)`,
        count: sql<number>`count(*)`,
      })
      .from(tokenPrices)
      .where(eq(tokenPrices.tokenId, t.id));

    console.log(`Token: ${t.symbol} (${t.name}) -> range: ${range.minDate} to ${range.maxDate}, total records: ${range.count}`);
  }

  const [goldRange] = await db
    .select({
      minDate: sql<string>`min(date)`,
      maxDate: sql<string>`max(date)`,
      count: sql<number>`count(*)`,
    })
    .from(goldPrices);

  console.log(`Gold: GOLD (COMEX Gold) -> range: ${goldRange.minDate} to ${goldRange.maxDate}, total records: ${goldRange.count}`);
}

main().catch(console.error);
