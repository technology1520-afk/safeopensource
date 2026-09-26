import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hash, verify } from '@node-rs/argon2';

import { checkRotatedKeyGrace } from './settings';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function decodeBase32(str: string): Buffer {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = str.toUpperCase().replace(/[=\s]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = base32chars.indexOf(clean.charAt(i));
    if (val === -1) {
      return Buffer.from(str, 'utf-8');
    }
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Verify RFC 6238 TOTP code (optional 2FA)
 */
export function verifyTotp(token?: string | null, secret?: string | null): boolean {
  const totpSecret = secret !== undefined ? secret : process.env.ADMIN_TOTP_SECRET;
  if (!totpSecret) return true; // Optional if not present in env
  if (!token) return false;

  const cleanToken = token.trim();
  const key = decodeBase32(totpSecret);
  const nowStep = Math.floor(Date.now() / 1000 / 30);

  for (let delta = -1; delta <= 1; delta++) {
    const step = nowStep + delta;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(step), 0);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buf);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      (((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)) %
      1000000;

    const expectedToken = code.toString().padStart(6, '0');
    if (safeCompare(cleanToken, expectedToken)) {
      return true;
    }
  }
  return false;
}

export interface Session {
  id: string;
  principal: 'owner';
  email: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthContext {
  principal: 'owner' | 'agent' | null;
  role: 'admin' | 'readonly' | null;
  session?: Session;
  ip: string;
  error?: string;
  rateLimited?: boolean;
}

// 30-minute session TTL
export const SESSION_TTL_MS = 30 * 60 * 1000;

// In-memory session store
const sessions = new Map<string, Session>();

// Rate limiter for failed auth attempts: max 5 fails/min/IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const failedAuthAttempts = new Map<string, RateLimitRecord>();

/**
 * Constant-time string comparison preventing timing side-channel attacks
 */
export function safeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant-time dummy comparison to prevent length timing leakage
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Check if IP is currently rate-limited due to repeated auth failures
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = failedAuthAttempts.get(ip);
  if (!record) return false;
  if (now > record.resetAt) {
    failedAuthAttempts.delete(ip);
    return false;
  }
  return record.count >= 5;
}

/**
 * Record a failed authentication attempt for an IP
 */
export function recordAuthFailure(ip: string): number {
  const now = Date.now();
  const record = failedAuthAttempts.get(ip);
  if (!record || now > record.resetAt) {
    failedAuthAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return 1;
  }
  record.count += 1;
  return record.count;
}

/**
 * Reset failed attempts on successful authentication
 */
export function resetAuthFailures(ip: string): void {
  failedAuthAttempts.delete(ip);
}

/**
 * Hash password with Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

/**
 * Verify owner password against Argon2id hash
 */
export async function verifyOwnerPassword(password: string, expectedHash?: string): Promise<boolean> {
  const targetHash = expectedHash || process.env.ADMIN_PASSWORD_HASH;
  if (!targetHash) return false;
  try {
    return await verify(targetHash, password);
  } catch {
    return false;
  }
}

/**
 * Create a new owner session with CSRF token and 30-min expiry
 */
export function createSession(email: string): Session {
  const id = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const session: Session = {
    id,
    principal: 'owner',
    email,
    csrfToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(id, session);
  return session;
}

/**
 * Get and validate an existing session. Rotates or expires if needed.
 */
export function getSession(sessionId?: string | null): Session | null {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  // Refresh expiration on activity (idle timeout 30 min)
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

/**
 * Destroy a session (logout)
 */
export function destroySession(sessionId?: string | null): void {
  if (sessionId) {
    sessions.delete(sessionId);
  }
}

/**
 * Extract client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  return '127.0.0.1';
}

/**
 * Authenticate incoming request for admin routes.
 * Handles both MCP agent Bearer token and owner session cookie.
 */
export async function authenticateRequest(request: Request, cookieSessionId?: string | null): Promise<AuthContext> {
  const ip = getClientIp(request);

  // Check rate limiting first
  if (isRateLimited(ip)) {
    return {
      principal: null,
      role: null,
      ip,
      rateLimited: true,
      error: 'Too many failed authentication attempts. Please wait 60 seconds.',
    };
  }

  // 1. Check Bearer Token (MCP client / Agent)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const adminKey = process.env.ADMIN_API_KEY;
    const readonlyKey = process.env.ADMIN_API_KEY_READONLY;

    if (adminKey && safeCompare(token, adminKey)) {
      resetAuthFailures(ip);
      return { principal: 'agent', role: 'admin', ip };
    }

    if (readonlyKey && safeCompare(token, readonlyKey)) {
      resetAuthFailures(ip);
      return { principal: 'agent', role: 'readonly', ip };
    }

    // Check 24-hour grace period for rotated keys
    const graceCheck = checkRotatedKeyGrace(token);
    if (graceCheck.valid) {
      resetAuthFailures(ip);
      return { principal: 'agent', role: graceCheck.role || 'admin', ip };
    }

    // Invalid Bearer key
    const failures = recordAuthFailure(ip);
    return {
      principal: null,
      role: null,
      ip,
      rateLimited: failures >= 5,
      error: 'Invalid API Key',
    };
  }

  // 2. Check Owner Session Cookie
  if (cookieSessionId) {
    const session = getSession(cookieSessionId);
    if (session) {
      resetAuthFailures(ip);
      return {
        principal: 'owner',
        role: 'admin',
        session,
        ip,
      };
    }
  }

  // 3. Unauthenticated
  return {
    principal: null,
    role: null,
    ip,
  };
}

/**
 * Validate CSRF token for owner mutating requests
 */
export function validateCsrf(session: Session, token?: string | null): boolean {
  if (!token || !session.csrfToken) return false;
  return safeCompare(token, session.csrfToken);
}
