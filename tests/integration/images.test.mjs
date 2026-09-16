import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';

// Run after npm run build: exercises the real adapter-node limit and disk storage.
test('production server accepts images above 512 KB and preserves them across restarts', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nestate-production-images-'));
  process.env.DATA_DIR = directory;
  const { createAdmin, createSession } = await import('../../src/lib/server/auth.ts');
  const { getDb } = await import('../../src/lib/server/db.ts');
  const user = createAdmin('smoke@example.test', 'Smoke-test-only-2026!');
  const { token } = createSession(user.id);
  getDb().close();
  const origin = 'http://127.0.0.1:4177';
  let child;
  let logs = '';
  async function start() {
    child = spawn(process.execPath, ['scripts/start.mjs'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '4177', ORIGIN: origin, BODY_SIZE_LIMIT: '' }, stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (data) => { logs += data; });
    child.stderr.on('data', (data) => { logs += data; });
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(logs);
      try { if ((await fetch(`${origin}/blog`)).ok) return; } catch { /* Server is starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Server failed to start: ${logs}`);
  }
  async function stop() {
    if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
  }
  try {
    await start();
    const image = await sharp(randomBytes(800 * 600 * 3), { raw: { width: 800, height: 600, channels: 3 } }).png().toBuffer();
    assert.ok(image.length > 512 * 1024 && image.length < 5 * 1024 * 1024);
    const upload = await fetch(`${origin}/admin/images`, { method: 'POST', headers: {
      origin, cookie: `nestate_session=${token}`, 'content-type': 'image/png', accept: 'application/json'
    }, body: image });
    assert.equal(upload.status, 201, await upload.clone().text());
    const { url } = await upload.json();
    const first = await fetch(`${origin}${url}`);
    assert.equal(first.headers.get('content-type'), 'image/webp');
    const stored = Buffer.from(await first.arrayBuffer());
    await stop();
    await start();
    const second = await fetch(`${origin}${url}`);
    assert.equal(second.status, 200);
    assert.deepEqual(Buffer.from(await second.arrayBuffer()), stored);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});
