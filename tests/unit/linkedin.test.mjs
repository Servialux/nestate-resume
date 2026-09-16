import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'nestate-linkedin-'));
process.env.DATA_DIR = directory;
process.env.SITE_URL = 'https://portfolio.example.com';
delete process.env.DATA_ENCRYPTION_KEY;

const { getDb } = await import('../../src/lib/server/db.ts');
const { getLinkedInSettings, saveLinkedInSettings, disconnectLinkedIn, shareOnLinkedIn, recoverStaleLinkedInShares } = await import('../../src/lib/server/linkedin.ts');
const originalFetch = globalThis.fetch;
const TOKEN = 'private-linkedin-test-access-token';
const AUTHOR = 'urn:li:person:abc123';

function configure(extra = {}) {
  return saveLinkedInSettings({ accessToken: TOKEN, authorUrn: AUTHOR, apiVersion: '202603', enabled: true, ...extra });
}

function insertPost(id = 'post-1', status = 'published', linkedinStatus = 'never') {
  const now = new Date().toISOString();
  getDb().prepare('INSERT INTO posts (id, slug, title, excerpt, content, status, createdAt, updatedAt, publishedAt, shareLinkedIn, linkedinStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)')
    .run(id, `article-${id}`, 'Créer un blog', 'Un résumé utile.', '# Le contenu complet', status, now, now, status === 'published' ? now : null, linkedinStatus);
}

function post(id = 'post-1') {
  return getDb().prepare('SELECT * FROM posts WHERE id = ?').get(id);
}

beforeEach(() => {
  getDb().exec('DELETE FROM posts; DELETE FROM settings;');
  process.env.SITE_URL = 'https://portfolio.example.com';
  delete process.env.DATA_ENCRYPTION_KEY;
  globalThis.fetch = async () => { throw new Error('An unexpected request was prevented by the test.'); };
});

after(() => {
  globalThis.fetch = originalFetch;
  getDb().close();
  rmSync(directory, { recursive: true, force: true });
});

test('réglages : chiffre le jeton au repos et n’envoie que des informations publiques au navigateur', () => {
  const settings = configure();
  assert.deepEqual(settings, { configured: true, tokenConfigured: true, authorUrn: AUTHOR, apiVersion: '202603', enabled: true, siteUrlConfigured: true });
  assert.equal(JSON.stringify(settings).includes(TOKEN), false);
  const stored = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('linkedin.accessToken').value;
  assert.match(stored, /^v1:/);
  assert.equal(stored.includes(TOKEN), false);
  assert.equal(readFileSync(join(directory, '.encryption-key'), 'utf8').trim().length, 44);
  assert.equal(statSync(join(directory, '.encryption-key')).mode & 0o777, 0o600);

  configure({ accessToken: '' });
  assert.equal(getDb().prepare('SELECT value FROM settings WHERE key = ?').get('linkedin.accessToken').value, stored);
  disconnectLinkedIn();
  assert.equal(getLinkedInSettings().configured, false);
  assert.equal(getLinkedInSettings().tokenConfigured, false);
  assert.equal(getLinkedInSettings().enabled, false);
});

test('réglages : valide l’URN, la version, le jeton et la clé de chiffrement', () => {
  assert.throws(() => configure({ authorUrn: 'https://linkedin.com/in/example' }), /urn:li:person/);
  assert.throws(() => configure({ apiVersion: '202613' }), /AAAAMM/);
  assert.throws(() => configure({ accessToken: 'contains spaces in token' }), /sans espace/);
  assert.throws(() => configure({ accessToken: '' }), /jeton et l’identifiant/);
  process.env.DATA_ENCRYPTION_KEY = 'invalid-key';
  assert.throws(() => configure(), /32 octets/);
  assert.equal(getLinkedInSettings().tokenConfigured, false);
});

test('envoi : payload article et en-têtes LinkedIn officiels, puis mémorisation du lien', async () => {
  configure();
  insertPost();
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.linkedin.com/rest/posts');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(init.headers['Linkedin-Version'], '202603');
    assert.equal(init.headers['X-Restli-Protocol-Version'], '2.0.0');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(post().linkedinStatus, 'pending', 'claim is durable before sending');
    const body = JSON.parse(init.body);
    assert.equal(body.author, AUTHOR);
    assert.equal(body.lifecycleState, 'PUBLISHED');
    assert.equal(body.visibility, 'PUBLIC');
    assert.deepEqual(body.distribution, { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] });
    assert.deepEqual(body.content.article, { source: 'https://portfolio.example.com/blog/article-post-1', title: 'Créer un blog', description: 'Un résumé utile.' });
    assert.equal(body.commentary, 'Créer un blog\n\nUn résumé utile.\n\nhttps://portfolio.example.com/blog/article-post-1');
    assert.equal(JSON.stringify(body).includes('# Le contenu complet'), false);
    return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:12345' } });
  };
  const result = await shareOnLinkedIn('post-1');
  assert.deepEqual(result, { status: 'sent', url: 'https://www.linkedin.com/feed/update/urn:li:share:12345/' });
  assert.equal(post().linkedinStatus, 'sent');
  assert.equal(post().linkedinError, null);
  assert.equal(post().status, 'published');
  assert.deepEqual(await shareOnLinkedIn('post-1'), result);
  assert.equal(calls, 1);
});

test('doublons : un seul appel externe lors de deux partages concurrents', async () => {
  configure();
  insertPost();
  let calls = 0;
  let completeRequest;
  globalThis.fetch = () => {
    calls++;
    return new Promise((resolve) => { completeRequest = resolve; });
  };
  const first = shareOnLinkedIn('post-1');
  const second = await shareOnLinkedIn('post-1');
  assert.equal(second.status, 'pending');
  assert.equal(calls, 1);
  completeRequest(new Response(null, { status: 201 }));
  assert.equal((await first).status, 'sent');
  getDb().prepare("UPDATE posts SET title = 'Un titre modifié' WHERE id = ?").run('post-1');
  assert.equal((await shareOnLinkedIn('post-1', { confirmUncertain: true })).status, 'sent');
  assert.equal(calls, 1);
});

test('texte : protège les parenthèses, hashtags et autres caractères réservés du format LinkedIn', async () => {
  configure();
  insertPost();
  getDb().prepare('UPDATE posts SET title = ?, excerpt = ? WHERE id = ?').run('Un blog (avec #Svelte)', '[Texte] @profil | <test> * _ ~ \\', 'post-1');
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.commentary, 'Un blog \\(avec \\#Svelte\\)\n\n\\[Texte\\] \\@profil \\| \\<test\\> \\* \\_ \\~ \\\\\n\nhttps://portfolio.example.com/blog/article-post-1');
    assert.equal(body.content.article.title, 'Un blog (avec #Svelte)');
    return new Response(null, { status: 201 });
  };
  assert.equal((await shareOnLinkedIn('post-1')).status, 'sent');
});

test('aucun partage de brouillon, de connecteur désactivé ou sans URL HTTPS publique explicite', async () => {
  configure();
  insertPost('draft', 'draft');
  insertPost();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201 }); };
  await assert.rejects(shareOnLinkedIn('draft'), /Publiez l’article/);
  for (const value of ['', 'http://portfolio.example.com', 'https://localhost', 'https://192.168.0.1', 'https://[::1]', 'https://site.local', 'https://user:pass@portfolio.example.com', 'https://portfolio.example.com/path', 'https://portfolio.example.com?secret=1']) {
    process.env.SITE_URL = value;
    assert.equal(getLinkedInSettings().siteUrlConfigured, false);
    await assert.rejects(shareOnLinkedIn('post-1'), /SITE_URL/);
    assert.equal(post().linkedinStatus, 'never');
  }
  process.env.SITE_URL = 'https://portfolio.example.com';
  configure({ enabled: false });
  await assert.rejects(shareOnLinkedIn('post-1'), /Activez/);
  assert.equal(calls, 0);
});

test('échec HTTP définitif : le blog reste publié et les réponses distantes restent secrètes', async () => {
  configure();
  insertPost();
  globalThis.fetch = async () => new Response(`server leaked ${TOKEN}`, { status: 401 });
  const result = await shareOnLinkedIn('post-1');
  assert.equal(result.status, 'failed');
  assert.match(result.error, /expiré ou invalide/);
  assert.equal(post().status, 'published');
  assert.equal(post().linkedinStatus, 'failed');
  assert.equal(post().linkedinError.includes(TOKEN), false);
  globalThis.fetch = async () => new Response(null, { status: 201 });
  assert.equal((await shareOnLinkedIn('post-1')).status, 'sent');
});

test('erreur réseau : résultat incertain, aucune répétition sans confirmation explicite', async () => {
  configure();
  insertPost();
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error(`timeout with ${TOKEN}`); };
  assert.equal((await shareOnLinkedIn('post-1')).status, 'uncertain');
  assert.equal(post().status, 'published');
  assert.equal(post().linkedinError.includes(TOKEN), false);
  assert.equal((await shareOnLinkedIn('post-1')).status, 'uncertain');
  assert.equal(calls, 1);
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201 }); };
  assert.equal((await shareOnLinkedIn('post-1', { confirmUncertain: true })).status, 'sent');
  assert.equal(calls, 2);
});

test('HTTP 408/5xx : résultat incertain, HTTP 403/429 : échec réessayable manuellement', async () => {
  configure();
  for (const status of [408, 500, 503, 403, 429]) {
    const id = `http-${status}`;
    insertPost(id);
    globalThis.fetch = async () => new Response('Do not store this', { status });
    const result = await shareOnLinkedIn(id);
    assert.equal(result.status, [408, 500, 503].includes(status) ? 'uncertain' : 'failed');
    assert.equal(post(id).status, 'published');
    assert.equal(post(id).linkedinError.includes('Do not store this'), false);
  }
});

test('redémarrage : les envois abandonnés deviennent incertains sans requête externe', async () => {
  configure();
  insertPost('interrupted', 'published', 'pending');
  insertPost('in-progress', 'published', 'pending');
  insertPost('no-claim', 'published', 'pending');
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('linkedin.claim.interrupted', JSON.stringify({ id: 'old-claim', startedAt: Date.now() - 121_000 }));
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('linkedin.claim.in-progress', JSON.stringify({ id: 'recent-claim', startedAt: Date.now() }));
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201 }); };
  recoverStaleLinkedInShares();
  assert.equal(post('interrupted').linkedinStatus, 'uncertain');
  assert.equal(post('no-claim').linkedinStatus, 'uncertain');
  assert.equal(post('in-progress').linkedinStatus, 'pending');
  assert.equal((await shareOnLinkedIn('interrupted')).status, 'uncertain');
  assert.equal(calls, 0);
});

test('201 sans identifiant valide : envoi conservé comme effectué sans lien externe non fiable', async () => {
  configure();
  insertPost();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201, headers: { 'x-restli-id': 'https://malicious.example' } }); };
  assert.deepEqual(await shareOnLinkedIn('post-1'), { status: 'sent' });
  assert.equal(post().linkedinUrl, null);
  await shareOnLinkedIn('post-1');
  assert.equal(calls, 1);
});

test('chiffrement : une mauvaise clé ou un jeton altéré bloque avant tout envoi', async () => {
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  configure();
  insertPost();
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201 }); };
  await assert.rejects(shareOnLinkedIn('post-1'), /ne peut pas être déchiffré/);
  assert.equal(post().linkedinStatus, 'never');
  assert.equal(calls, 0);
});

test('déconnexion : supprime les secrets sans effacer la trace des publications', async () => {
  configure();
  insertPost();
  globalThis.fetch = async () => new Response(null, { status: 201 });
  await shareOnLinkedIn('post-1');
  disconnectLinkedIn();
  configure();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 201 }); };
  assert.equal((await shareOnLinkedIn('post-1')).status, 'sent');
  assert.equal(calls, 0);
});
