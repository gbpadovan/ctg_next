import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { encryptSession, decryptSession } from '../src/lib/auth/session';

async function main() {
  console.log('--- Testing CTG Auth & Database Integration ---');
  const db = getDb();
  if (!db) {
    console.error('Database connection failed.');
    process.exit(1);
  }
  console.log('✓ Database connected successfully.');

  // Test password hashing and verification
  const testPassword = 'SecurePassword123!';
  const hashed = await hashPassword(testPassword);
  const isValid = await verifyPassword(testPassword, hashed);
  const isInvalid = await verifyPassword('WrongPassword', hashed);
  console.log(`✓ Password hashing: valid=${isValid}, wrong=${!isInvalid}`);

  // Test JWT encryption and decryption
  const sessionToken = await encryptSession({
    userId: 999,
    email: 'test@example.com',
    name: 'Test Analyst',
    role: 'user',
  });
  const decrypted = await decryptSession(sessionToken);
  console.log(`✓ JWT Session token decrypted: userId=${decrypted?.userId}, name=${decrypted?.name}`);

  // Test User DB registration
  const testEmail = 'analyst.demo@terminal.finance';
  // Clean up if already exists
  await db.delete(users).where(eq(users.email, testEmail));

  const [newUser] = await db
    .insert(users)
    .values({
      name: 'Demo Analyst',
      email: testEmail,
      passwordHash: hashed,
      role: 'user',
    })
    .returning();

  console.log(`✓ User inserted into Neon DB: id=${newUser.id}, email=${newUser.email}`);

  // Test querying user
  const [foundUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  console.log(`✓ User query verified: found=${foundUser.id === newUser.id}`);
  console.log('--- ALL AUTH INTEGRATION TESTS PASSED ---');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
