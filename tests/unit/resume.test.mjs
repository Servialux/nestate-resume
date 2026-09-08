import { test } from 'node:test';
import assert from 'node:assert/strict';
import { year, period, safeUrl, imageUrl } from '../../src/lib/resume.ts';

test('dates: années et périodes du CV, dont les postes en cours', () => {
  assert.equal(year('2023-09-01'), '2023');
  assert.equal(year(), '');
  assert.equal(year('inconnu'), '');
  assert.equal(period('2021-01', '2023-09'), '2021 — 2023');
  assert.equal(period('2023-09'), '2023 — Aujourd’hui');
  assert.equal(period(undefined, '2021'), '2021');
  assert.equal(period(), '');
});

test('liens: seuls les liens web absolus sont affichables', () => {
  assert.equal(safeUrl('https://example.com/projet'), 'https://example.com/projet');
  assert.equal(safeUrl('http://example.com'), 'http://example.com/');
  for (const value of [undefined, '', '/relatif', 'invalide', 'javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test']) {
    assert.equal(safeUrl(value), undefined);
  }
});

test('images: accepte les assets locaux et refuse les chemins hors du dossier images', () => {
  assert.equal(imageUrl('/images/portrait.webp'), '/images/portrait.webp');
  assert.equal(imageUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  for (const value of [undefined, '/images/../secret', '/autre/photo.jpg', 'data:image/png,test']) {
    assert.equal(imageUrl(value), undefined);
  }
});
