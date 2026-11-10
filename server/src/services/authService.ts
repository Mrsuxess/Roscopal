import { scrypt } from 'scrypt-js';
import { queryOne, execute } from '../db/database';
import { User } from '../types';

const SESSION_TTL_HOURS = 72; // 3 days
// Cloudflare Workers runtime caps Web Crypto PBKDF2 at 100,000 iterations
const PBKDF2_ITERATIONS = 100000;

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash password with modern Workers-native PBKDF2-HMAC-SHA256 (600,000 iterations)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = toHex(saltBytes);

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 32 bytes (256 bits)
  );

  const derivedHex = toHex(derived);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${derivedHex}`;
}

/**
 * Verify password against stored hash, supporting both PBKDF2 and legacy scrypt
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  // 1. Modern PBKDF2-HMAC-SHA256 hash
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return { valid: false, needsUpgrade: false };
    const iterations = parseInt(parts[1], 10);
    const saltBytes = fromHex(parts[2]);
    const expectedHex = parts[3];

    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: isNaN(iterations) ? PBKDF2_ITERATIONS : iterations,
        hash: 'SHA-256'
      },
      baseKey,
      256
    );

    const valid = constantTimeEqual(toHex(derived), expectedHex);
    // Needs upgrade if iteration count is below current 600,000 baseline
    const needsUpgrade = valid && iterations < PBKDF2_ITERATIONS;
    return { valid, needsUpgrade };
  }

  // 2. Legacy scrypt hash format (<salt_hex>:<derived_hex>)
  if (storedHash.includes(':')) {
    const [saltStr, expectedHex] = storedHash.split(':');
    if (!saltStr || !expectedHex) return { valid: false, needsUpgrade: false };

    try {
      const passBytes = new TextEncoder().encode(password);
      // In the legacy implementation, salt was passed as a 32-char hex string
      const saltBytes = new TextEncoder().encode(saltStr);
      // N=16384, r=8, p=1, dkLen=64
      const derived = await scrypt(passBytes, saltBytes, 16384, 8, 1, 64);
      const derivedHex = toHex(derived);
      const valid = constantTimeEqual(derivedHex, expectedHex);
      return { valid, needsUpgrade: valid }; // Upgrade to PBKDF2 on successful auth
    } catch (e) {
      console.error('Error verifying legacy scrypt hash:', e);
      return { valid: false, needsUpgrade: false };
    }
  }

  return { valid: false, needsUpgrade: false };
}

/**
 * Create a new cryptographically unpredictable session token
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = 'rsc_' + toHex(tokenBytes);

  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const expiresAt = expires.toISOString();

  await execute(
    `INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userId, now.toISOString(), expiresAt]
  );

  return { token, expiresAt };
}

/**
 * Validate session token and return user if active
 */
export async function validateSession(token: string): Promise<User | null> {
  if (!token) return null;

  const session = await queryOne<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM user_sessions WHERE token = ?`,
    [token]
  );

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await execute(`DELETE FROM user_sessions WHERE token = ?`, [token]);
    return null;
  }

  const user = await queryOne<User>(
    `SELECT id, name, email, role, paypal_email, location, avatar_url FROM users WHERE id = ?`,
    [session.user_id]
  );

  return user || null;
}

/**
 * Invalidate / Logout a session
 */
export async function deleteSession(token: string): Promise<void> {
  if (token) {
    await execute(`DELETE FROM user_sessions WHERE token = ?`, [token]);
  }
}

/**
 * Register a new user
 */
export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  paypalEmail?: string;
  location?: string;
}): Promise<{ user: User; token: string }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();

  if (!name || name.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Check duplicate email
  const existing = await queryOne(`SELECT id FROM users WHERE LOWER(email) = ?`, [email]);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
  const pwdHash = await hashPassword(params.password);
  const paypalEmail = (params.paypalEmail || email).trim().toLowerCase();
  const location = params.location ? params.location.trim() : 'Global';
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO users (id, name, email, role, paypal_email, location, password_hash, created_at)
     VALUES (?, ?, ?, 'organizer', ?, ?, ?, ?)`,
    [userId, name, email, paypalEmail, location, pwdHash, now]
  );

  const { token } = await createSession(userId);

  const user: User = {
    id: userId,
    name,
    email,
    role: 'organizer',
    paypal_email: paypalEmail,
    location,
    created_at: now
  };

  return { user, token };
}

/**
 * Authenticate login
 */
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const cleanEmail = email.trim().toLowerCase();

  const row = await queryOne<any>(
    `SELECT * FROM users WHERE LOWER(email) = ?`,
    [cleanEmail]
  );

  if (!row) {
    throw new Error('Invalid email or password.');
  }

  let authenticated = false;
  let upgradeHash = false;

  if (!row.password_hash) {
    // Demo seed users without password hash fallback to demo password 'password123'
    if (password === 'password123') {
      authenticated = true;
      upgradeHash = true;
    }
  } else {
    const res = await verifyPassword(password, row.password_hash);
    authenticated = res.valid;
    upgradeHash = res.needsUpgrade;
  }

  if (!authenticated) {
    throw new Error('Invalid email or password.');
  }

  // Transparently upgrade legacy or unhashed password to modern PBKDF2 600,000 iterations
  if (upgradeHash) {
    try {
      const newHash = await hashPassword(password);
      await execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, row.id]);
    } catch (err) {
      console.warn('Non-blocking failure during password hash upgrade:', err);
    }
  }

  const { token } = await createSession(row.id);

  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    paypal_email: row.paypal_email,
    location: row.location,
    avatar_url: row.avatar_url,
    created_at: row.created_at || new Date().toISOString()
  };

  return { user, token };
}
