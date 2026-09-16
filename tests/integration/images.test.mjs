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
test('built server accepts images near 50 MiB, preserves uploads and enforces environment-specific SEO', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nestate-production-images-'));
  process.env.DATA_DIR = directory;
  const { createAdmin, createSession } = await import('../../src/lib/server/auth.ts');
  const { getDb } = await import('../../src/lib/server/db.ts');
  const { savePost } = await import('../../src/lib/server/posts.ts');
  const user = createAdmin('smoke@example.test', 'Smoke-test-only-2026!');
  const { token } = createSession(user.id);
  const postInput = { title: 'Article SEO </script>', excerpt: 'Description publique', content: '## Section', shareLinkedIn: false };
  const published = savePost(null, { ...postInput, intent: 'publish' });
  const draft = savePost(null, { ...postInput, title: 'Brouillon privé', intent: 'draft' });
  getDb().close();
  const origin = 'http://127.0.0.1:4177';
  let child;
  let logs = '';
  async function start(environment = 'production') {
    child = spawn(process.execPath, ['scripts/start.mjs'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '4177', ORIGIN: origin, BODY_SIZE_LIMIT: '', SITE_URL: 'https://example.test', INDEXING_ENABLED: 'true', RAILWAY_ENVIRONMENT_NAME: environment }, stdio: ['ignore', 'pipe', 'pipe']
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
    const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
    assert.ok(sitemap.includes(`https://example.test/blog/${published.slug}`));
    assert.ok(!sitemap.includes(draft.slug) && !sitemap.includes('/admin'));
    const robots = await (await fetch(`${origin}/robots.txt`)).text();
    assert.ok(robots.includes('Sitemap: https://example.test/sitemap.xml'));
    const article = await fetch(`${origin}/blog/${published.slug}?tracking=ignored`);
    assert.equal(article.headers.get('x-robots-tag'), null);
    const html = await article.text();
    assert.ok(html.includes(`rel="canonical" href="https://example.test/blog/${published.slug}"`));
    assert.ok(html.includes('content="index, follow, max-image-preview:large"'));
    const structured = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(structured['@graph'][0].headline, postInput.title);
    assert.equal(structured['@graph'][0].mainEntityOfPage, `https://example.test/blog/${published.slug}`);
    const image = await sharp(randomBytes(4096 * 4096 * 3), { raw: { width: 4096, height: 4096, channels: 3 } }).png().toBuffer();
    assert.ok(image.length > 45 * 1024 * 1024 && image.length < 50 * 1024 * 1024);
    const upload = await fetch(`${origin}/admin/images`, { method: 'POST', headers: {
      origin, cookie: `nestate_session=${token}`, 'content-type': 'image/png', accept: 'application/json'
    }, body: image });
    assert.equal(upload.status, 201, await upload.clone().text());
    const { url } = await upload.json();
    const first = await fetch(`${origin}${url}`);
    assert.equal(first.headers.get('content-type'), 'image/webp');
    const stored = Buffer.from(await first.arrayBuffer());
    const withdrawn = await fetch(`${origin}/admin/articles/${published.id}?/save`, {
      method: 'POST', redirect: 'manual', headers: { origin, cookie: `nestate_session=${token}`, accept: 'text/html' },
      body: new URLSearchParams({ title: postInput.title, excerpt: postInput.excerpt, content: postInput.content, intent: 'unpublish' })
    });
    assert.equal(withdrawn.status, 200);
    assert.ok(!(await (await fetch(`${origin}/sitemap.xml`)).text()).includes(published.slug));
    await stop();
    await start('recette');
    const staging = await fetch(`${origin}/blog`);
    assert.equal(staging.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok(!(await (await fetch(`${origin}/sitemap.xml`)).text()).includes('<loc>'));
    const second = await fetch(`${origin}${url}`);
    assert.equal(second.status, 200);
    assert.deepEqual(Buffer.from(await second.arrayBuffer()), stored);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});
