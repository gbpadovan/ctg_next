import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type CTGDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: CTGDatabase | null = null;

export function getDb(): CTGDatabase | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '' || url.includes('user:password@endpoint')) {
    return null;
  }

  if (!cachedDb) {
    try {
      const sql = neon(url);
      cachedDb = drizzle(sql, { schema });
    } catch (err) {
      console.warn('Failed to initialize Neon Database client:', err);
      return null;
    }
  }

  return cachedDb;
}

export const db = getDb();
export { schema };
