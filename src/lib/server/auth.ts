import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.ts';

export type SessionUser = { id: string; email: string };

export const SESSION_COOKIE = 'nestate_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_HASH = `scrypt:${'00'.repeat(16)}:${'00'.repeat(64)}`;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, storedKey] = encoded.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(storedKey ?? '')) return false;
  const actualKey = scryptSync(password, salt, 64, SCRYPT_OPTIONS);
  return timingSafeEqual(actualKey, Buffer.from(storedKey, 'hex'));
}

export function hasAdmin(): boolean {
  return !!getDb().prepare('SELECT id FROM users LIMIT 1').get();
}

/** Provision the sole owner locally; there is deliberately no public registration route. */
export function createAdmin(email: string, password: string, options: { reset?: boolean } = {}): SessionUser {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Saisissez une adresse e-mail valide.');
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 1024) {
    throw new Error('Le mot de passe doit contenir au moins 12 caractères et au plus 1 024 octets.');
  }
  const db = getDb();
  if (hasAdmin() && !options.reset) {
    throw new Error('Un compte existe déjà. Utilisez --reset pour le remplacer et révoquer ses sessions.');
  }

  const passwordHash = hashPassword(password);
  const user = { id: randomUUID(), email: normalizedEmail };
  db.exec('BEGIN IMMEDIATE');
  try {
    // Recheck inside the transaction so concurrent provisioning cannot replace an owner.
    if (hasAdmin() && !options.reset) throw new Error('Un compte existe déjà. Utilisez --reset pour le remplacer.');
    if (options.reset) {
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM login_attempts').run();
    }
    db.prepare('INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)')
      .run(user.id, user.email, passwordHash, new Date().toISOString());
    db.exec('COMMIT');
    return user;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Count attempts in SQLite so restarting the server does not reset the limit. */
export function authenticateAdmin(email: string, password: string, clientAddress: string): {
  user: SessionUser | null;
  rateLimited: boolean;
} {
  const db = getDb();
  const now = Date.now();
  db.prepare('DELETE FROM login_attempts WHERE expiresAt <= ?').run(now);
  const normalizedEmail = normalizeEmail(email).slice(0, 254);
  const buckets = [
    { key: hashToken(`address:${clientAddress}`), limit: 10 },
    { key: hashToken(`login:${clientAddress}:${normalizedEmail}`), limit: 5 }
  ];

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const bucket of buckets) {
      const row = db.prepare('SELECT attempts FROM login_attempts WHERE key = ?').get(bucket.key);
      if (row && Number(row.attempts) >= bucket.limit) {
        db.exec('COMMIT');
        return { user: null, rateLimited: true };
      }
    }
    for (const bucket of buckets) {
      db.prepare(`INSERT INTO login_attempts (key, attempts, expiresAt) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`).run(bucket.key, now + ATTEMPT_WINDOW);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  const user = db.prepare('SELECT id, email, passwordHash FROM users WHERE email = ?').get(normalizedEmail);
  const acceptableInput = email.length <= 254 && Buffer.byteLength(password, 'utf8') <= 1024;
  const validPassword = verifyPassword(acceptableInput ? password : '', user ? String(user.passwordHash) : DUMMY_HASH);
  if (!user || !acceptableInput || !validPassword) return { user: null, rateLimited: false };

  for (const bucket of buckets) db.prepare('DELETE FROM login_attempts WHERE key = ?').run(bucket.key);
  return { user: { id: String(user.id), email: String(user.email) }, rateLimited: false };
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const db = getDb();
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  db.prepare('DELETE FROM sessions WHERE expiresAt <= ?').run(Date.now());
  db.prepare('INSERT INTO sessions (tokenHash, userId, expiresAt) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function getSessionUser(token: string | undefined): SessionUser | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = getDb();
  const user = db.prepare(`SELECT users.id, users.email FROM sessions
    JOIN users ON users.id = sessions.userId WHERE tokenHash = ? AND expiresAt > ?`)
    .get(hashToken(token), Date.now());
  return user ? { id: String(user.id), email: String(user.email) } : null;
}

export function revokeSession(token: string | undefined): void {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  getDb().prepare('DELETE FROM sessions WHERE tokenHash = ?').run(hashToken(token));
}
