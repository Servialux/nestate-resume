import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../../src/lib/markdown.ts';

test('Markdown renders tables, inline formatting, nested lists, links and images', () => {
  const html = renderMarkdown('# Titre\n\n**Gras**, *italique*, ~~barré~~, `code`\n\n| Nom | Valeur |\n| --- | ---: |\n| **Café** | 42 |\n\n1. Premier\n   - Imbriqué\n\n> Citation\n\n[Lien](https://example.test)\n\n![Description](/media/exemple.webp)\n\n```js\nconst x = "<script>";\n```');
  for (const expected of ['<h2 id="section-titre">Titre</h2>', '<strong>Gras</strong>', '<em>italique</em>', '<s>barré</s>', '<table>', '<th', 'text-align:right', '<strong>Café</strong>', '<ol>', '<ul>', '<blockquote>', 'href="https://example.test"', 'alt="Description"', 'loading="lazy"', 'language-js', '&lt;script&gt;']) assert.ok(html.includes(expected), expected);
});

test('authored HTML and dangerous links never become executable markup', () => {
  for (const content of [
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
    '[click](javascript:alert%281%29)', '[click](jav&#x61;script:alert%281%29)',
    '![x](data:image/svg+xml;base64,PHN2Zz4=)', '![x](data:image/png;base64,aGVsbG8=)',
    '[file](file:///etc/passwd)', '[x](vbscript:test)',
    '![" onerror="alert(1)](https://example.test/image.png)'
  ]) {
    const html = renderMarkdown(content);
    assert.doesNotMatch(html, /<script|<img src=x|(?:src|href)="(?:javascript|vbscript|data|file):|" onerror="/i);
  }
});

test('tables and fences preserve escaped contents instead of interpreting HTML', () => {
  const html = renderMarkdown('| Valeur |\n| --- |\n| <script>alert(1)</script> |\n\n```html\n<img src=x onerror=alert(1)>\n```');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
  assert.doesNotMatch(html, /<script|<img /);
});
