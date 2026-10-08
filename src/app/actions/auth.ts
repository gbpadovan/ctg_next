'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, deleteSession, getSession, SessionPayload } from '@/lib/auth/session';

export interface AuthActionState {
  error?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  success?: boolean;
}

export async function registerAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const name = (formData.get('name') as string || '').trim();
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string || '';
  const confirmPassword = formData.get('confirmPassword') as string || '';

  const fieldErrors: AuthActionState['fieldErrors'] = {};

  if (!name || name.length < 2) {
    fieldErrors.name = 'Name must be at least 2 characters.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    fieldErrors.email = 'Please provide a valid email address.';
  }

  if (!password || password.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters.';
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const db = getDb();
  if (!db) {
    return {
      error: 'Database connection is unavailable. Please verify DATABASE_URL configuration.',
    };
  }

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return {
        fieldErrors: {
          email: 'An account with this email address already exists.',
        },
      };
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: 'user',
      })
      .returning();

    await createSession({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return {
      error: 'An unexpected error occurred while creating your account. Please try again.',
    };
  }

  redirect('/');
}

export async function loginAction(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string || '';

  const fieldErrors: AuthActionState['fieldErrors'] = {};

  if (!email) {
    fieldErrors.email = 'Please enter your email.';
  }

  if (!password) {
    fieldErrors.password = 'Please enter your password.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const db = getDb();
  if (!db) {
    return {
      error: 'Database connection is unavailable. Please verify DATABASE_URL configuration.',
    };
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return {
        error: 'Invalid email or password.',
      };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return {
        error: 'Invalid email or password.',
      };
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err: unknown) {
    console.error('Login error:', err);
    return {
      error: 'An unexpected error occurred while logging in. Please try again.',
    };
  }

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}

export async function getCurrentUserAction(): Promise<SessionPayload | null> {
  return getSession();
}
