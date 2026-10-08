import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  expiresAt: string;
}

const SESSION_COOKIE_NAME = 'ctg_session';
const SESSION_DURATION_DAYS = 7;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'ctg_auth_secret_fallback_key_production_grade_32_bytes_min!';
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sessionData: SessionPayload = {
    ...payload,
    expiresAt,
  };

  return new SignJWT({ ...sessionData })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());
}

export async function decryptSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await encryptSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
  });

  const cookieStore = await cookies();
  const expiresDate = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresDate,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
}

export { SESSION_COOKIE_NAME };
