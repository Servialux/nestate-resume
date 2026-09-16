import test from 'node:test';
import assert from 'node:assert/strict';
import { getSiteConfig } from '../../src/lib/server/site.ts';
import { absoluteUrl, escapeXml, metaDescription, serializeJsonLd } from '../../src/lib/seo.ts';
import { firstMarkdownImage, renderMarkdown } from '../../src/lib/markdown.ts';

test('indexing is opt-in and Railway recette never becomes indexable', () => {
  assert.equal(getSiteConfig({}).indexable, false);
  assert.equal(getSiteConfig({ SITE_URL: 'https://nestate.site', RAILWAY_ENVIRONMENT_NAME: 'production' }).indexable, true);
  assert.equal(getSiteConfig({ SITE_URL: 'https://recette.example', RAILWAY_ENVIRONMENT_NAME: 'recette', INDEXING_ENABLED: 'true' }).indexable, false);
  assert.equal(getSiteConfig({ SITE_URL: 'https://nestate.site', RAILWAY_ENVIRONMENT_NAME: 'production', INDEXING_ENABLED: 'false' }).indexable, false);
  for (const SITE_URL of ['javascript:alert(1)', 'http://site.example', 'https://user:password@site.example', 'bad url']) assert.equal(getSiteConfig({ SITE_URL, INDEXING_ENABLED: 'true' }).indexable, false);
  assert.equal(absoluteUrl('/blog/article', 'https://nestate.site'), 'https://nestate.site/blog/article');
});

test('structured data and XML escape authored content without changing its meaning', () => {
  const data = { title: '</script><script>alert(1)</script>', text: 'A & B "café"' };
  const serialized = serializeJsonLd(data);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), data);
  assert.equal(escapeXml('<&"\'>'), '&lt;&amp;&quot;&apos;&gt;');
  assert.ok(metaDescription('mot '.repeat(100)).length <= 170);
});

test('article headings remain below the page title with unique anchors and table header scope', () => {
  const html = renderMarkdown('# Titre\n\n#### Détail\n\n## Titre\n\n| Nom |\n| --- |\n| Valeur |');
  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /<h2 id="section-titre">/);
  assert.match(html, /<h3 id="section-detail">/);
  assert.match(html, /id="section-titre-2"/);
  assert.match(html, /scope="col"/);
  const anchors = [...renderMarkdown('## Titre\n\n## Titre\n\n## Titre 2\n\n## Titre').matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(anchors).size, anchors.length);
});

test('social image selection uses authored Markdown and ignores raw HTML/unsafe URLs', () => {
  assert.deepEqual(firstMarkdownImage('![Description](/media/image.webp)'), { src: '/media/image.webp', alt: 'Description' });
  assert.equal(firstMarkdownImage('<img src="https://example.test/raw.png">'), undefined);
  assert.equal(firstMarkdownImage('![bad](javascript:alert%281%29)'), undefined);
});
