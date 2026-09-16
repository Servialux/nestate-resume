import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'nestate-auth-'));
process.env.DATA_DIR = directory;
const { createAdmin, hasAdmin, authenticateAdmin, createSession, getSessionUser, revokeSession } = await import('../../src/lib/server/auth.ts');
const { getDb } = await import('../../src/lib/server/db.ts');
after(() => {
  getDb().close();
  rmSync(directory, { recursive: true, force: true });
});

test('owner provisioning, hashed credentials, persisted rate limits and session lifecycle', () => {
  assert.equal(hasAdmin(), false);
  assert.throws(() => createAdmin('not-an-email', 'long-password-123'));
  assert.throws(() => createAdmin('owner@example.test', 'short'));
  const owner = createAdmin(' Owner@Example.Test ', 'long-password-123');
  assert.equal(owner.email, 'owner@example.test');
  assert.equal(hasAdmin(), true);
  assert.throws(() => createAdmin('another@example.test', 'long-password-123'), /--reset/);
  const storedOwner = getDb().prepare('SELECT passwordHash FROM users').get();
  assert.notEqual(storedOwner.passwordHash, 'long-password-123');
  assert.match(storedOwner.passwordHash, /^scrypt:/);

  assert.equal(authenticateAdmin('owner@example.test', 'incorrect', '198.51.100.1').user, null);
  assert.equal(authenticateAdmin('nobody@example.test', 'long-password-123', '198.51.100.1').user, null);
  assert.deepEqual(authenticateAdmin('OWNER@example.test', 'long-password-123', '198.51.100.1').user, owner);

  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(authenticateAdmin('owner@example.test', 'incorrect', '198.51.100.2').rateLimited, false);
  }
  assert.equal(authenticateAdmin('owner@example.test', 'long-password-123', '198.51.100.2').rateLimited, true);
  assert.ok(getDb().prepare('SELECT COUNT(*) AS count FROM login_attempts').get().count > 0);
  assert.deepEqual(authenticateAdmin('owner@example.test', 'long-password-123', '198.51.100.3').user, owner);
  getDb().prepare('UPDATE login_attempts SET expiresAt = ?').run(Date.now() - 1);
  assert.deepEqual(authenticateAdmin('owner@example.test', 'long-password-123', '198.51.100.2').user, owner);

  const session = createSession(owner.id);
  const storedSession = getDb().prepare('SELECT tokenHash FROM sessions').get();
  assert.notEqual(storedSession.tokenHash, session.token);
  assert.equal(storedSession.tokenHash, createHash('sha256').update(session.token).digest('hex'));
  assert.deepEqual(getSessionUser(session.token), owner);
  assert.equal(getSessionUser('malformed'), null);
  assert.equal(getSessionUser('a'.repeat(64)), null);
  revokeSession(session.token);
  assert.equal(getSessionUser(session.token), null);

  const expired = createSession(owner.id);
  getDb().prepare('UPDATE sessions SET expiresAt = ?').run(Date.now() - 1);
  assert.equal(getSessionUser(expired.token), null);
  const active = createSession(owner.id);
  const replacement = createAdmin('new-owner@example.test', 'replacement-password-123', { reset: true });
  assert.equal(getSessionUser(active.token), null);
  assert.equal(authenticateAdmin(owner.email, 'long-password-123', '198.51.100.4').user, null);
  assert.deepEqual(authenticateAdmin(replacement.email, 'replacement-password-123', '198.51.100.4').user, replacement);
});
