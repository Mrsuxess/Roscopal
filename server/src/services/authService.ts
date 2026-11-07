import crypto from 'crypto';
import { queryOne, execute } from '../db/database';
import { User } from '../types';

const SESSION_TTL_HOURS = 72; // 3 days

/**
 * Hash password with cryptographically secure scrypt + salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored salt:hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

/**
 * Create a new persistent session token
 */
export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = 'rsc_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const expiresAt = expires.toISOString();

  execute(
    `INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [token, userId, now.toISOString(), expiresAt]
  );

  return { token, expiresAt };
}

/**
 * Validate session token and return user if active
 */
export function validateSession(token: string): User | null {
  if (!token) return null;

  const session = queryOne<{ user_id: string; expires_at: string }>(
    `SELECT user_id, expires_at FROM user_sessions WHERE token = ?`,
    [token]
  );

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    execute(`DELETE FROM user_sessions WHERE token = ?`, [token]);
    return null;
  }

  const user = queryOne<User>(
    `SELECT id, name, email, role, paypal_email, location, avatar_url FROM users WHERE id = ?`,
    [session.user_id]
  );

  return user || null;
}

/**
 * Invalidate / Logout a session
 */
export function deleteSession(token: string): void {
  if (token) {
    execute(`DELETE FROM user_sessions WHERE token = ?`, [token]);
  }
}

/**
 * Register a new user
 */
export function registerUser(params: {
  name: string;
  email: string;
  password: string;
  paypalEmail?: string;
  location?: string;
}): { user: User; token: string } {
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

  // Check duplicate
  const existing = queryOne(`SELECT id FROM users WHERE LOWER(email) = ?`, [email]);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
  const pwdHash = hashPassword(params.password);
  const paypalEmail = (params.paypalEmail || email).trim().toLowerCase();
  const location = params.location ? params.location.trim() : 'Global';
  const now = new Date().toISOString();

  execute(
    `INSERT INTO users (id, name, email, role, paypal_email, location, password_hash, created_at)
     VALUES (?, ?, ?, 'organizer', ?, ?, ?, ?)`,
    [userId, name, email, paypalEmail, location, pwdHash, now]
  );

  const { token } = createSession(userId);

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
export function loginUser(email: string, password: string): { user: User; token: string } {
  const cleanEmail = email.trim().toLowerCase();

  const row = queryOne<any>(
    `SELECT * FROM users WHERE LOWER(email) = ?`,
    [cleanEmail]
  );

  if (!row) {
    throw new Error('Invalid email or password.');
  }

  // Handle demo users or users without password_hash (fallback to 'password123' if not hashed yet)
  let valid = false;
  if (!row.password_hash) {
    if (password === 'password123') {
      valid = true;
      // Auto upgrade hash
      const newHash = hashPassword('password123');
      execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, row.id]);
    }
  } else {
    valid = verifyPassword(password, row.password_hash);
  }

  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  const { token } = createSession(row.id);

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
