import { pgTable, serial, text, numeric, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(), // e.g. "BTC", "PLS", "HEX", "PLSX"
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(), // 'yahoo' | 'dexscreener' | 'coingecko'
  sourceIdentifier: text('source_identifier').notNull(), // 'BTC-USD' or pair contract address
  chain: text('chain'), // 'pulsechain', 'ethereum', etc.
  quoteToken: text('quote_token').default('USD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tokenPrices = pgTable(
  'token_prices',
  {
    id: serial('id').primaryKey(),
    tokenId: serial('token_id').references(() => tokens.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    open: numeric('open', { precision: 24, scale: 10 }).notNull(),
    high: numeric('high', { precision: 24, scale: 10 }).notNull(),
    low: numeric('low', { precision: 24, scale: 10 }).notNull(),
    close: numeric('close', { precision: 24, scale: 10 }).notNull(),
    volume: numeric('volume', { precision: 28, scale: 4 }),
    marketCap: numeric('market_cap', { precision: 28, scale: 4 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('token_date_unique_idx').on(t.tokenId, t.date),
    index('token_prices_date_idx').on(t.date),
  ]
);

export const goldPrices = pgTable(
  'gold_prices',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull().unique(),
    open: numeric('open', { precision: 16, scale: 4 }).notNull(),
    high: numeric('high', { precision: 16, scale: 4 }).notNull(),
    low: numeric('low', { precision: 16, scale: 4 }).notNull(),
    close: numeric('close', { precision: 16, scale: 4 }).notNull(),
    volume: numeric('volume', { precision: 20, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('gold_prices_date_idx').on(t.date),
  ]
);

export const syncHistory = pgTable('sync_history', {
  id: serial('id').primaryKey(),
  target: text('target').notNull(), // 'GOLD' or token symbol
  lastDateSynced: date('last_date_synced').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
export type TokenPrice = typeof tokenPrices.$inferSelect;
export type NewTokenPrice = typeof tokenPrices.$inferInsert;
export type GoldPrice = typeof goldPrices.$inferSelect;
export type NewGoldPrice = typeof goldPrices.$inferInsert;
export type SyncHistory = typeof syncHistory.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
