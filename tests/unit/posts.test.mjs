import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'nestate-posts-'));
process.env.DATA_DIR = directory;
const { getDb } = await import('../../src/lib/server/db.ts');
const { savePost, listPosts, getPost, getPublishedPost, publicArticle } = await import('../../src/lib/server/posts.ts');
after(() => { getDb().close(); rmSync(directory, { recursive: true, force: true }); });

test('drafts stay private; publication, edits and unpublication preserve a stable URL and social receipt', () => {
  const input = { title: 'Écrire avec l’IA', excerpt: 'Un résumé.', content: 'Un contenu.', shareLinkedIn: false, intent: 'draft' };
  const draft = savePost(null, input);
  assert.equal(getPublishedPost(draft.slug), null);
  assert.equal(listPosts(true).length, 0);
  const published = savePost(draft.id, { ...input, intent: 'publish' });
  assert.equal(getPublishedPost(draft.slug)?.id, draft.id);
  assert.ok(published.publishedAt);
  getDb().prepare("UPDATE posts SET linkedinStatus='sent',linkedinUrl=?,linkedinError=? WHERE id=?")
    .run('https://www.linkedin.com/feed/update/urn:li:share:123', 'private diagnostic', draft.id);
  const edited = savePost(draft.id, { ...input, title: 'Un nouveau titre', intent: 'publish' });
  assert.equal(edited.slug, draft.slug);
  assert.equal(edited.publishedAt, published.publishedAt);
  assert.equal(edited.linkedinStatus, 'sent');
  assert.equal(publicArticle(edited).linkedinError, null);
  savePost(draft.id, { ...input, intent: 'unpublish' });
  assert.equal(getPublishedPost(draft.slug), null);
  assert.equal(getPost(draft.id).linkedinStatus, 'sent');
});

test('incomplete publications and overlong values are refused without writing', () => {
  const count = listPosts().length;
  const input = { title: 'Titre', excerpt: '', content: '', shareLinkedIn: false, intent: 'publish' };
  assert.throws(() => savePost(null, input), /résumé/);
  assert.throws(() => savePost(null, { ...input, title: 'a'.repeat(161) }), /160/);
  assert.throws(() => savePost(null, { ...input, intent: 'unknown' }), /Action/);
  assert.equal(listPosts().length, count);
});
