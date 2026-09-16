import { test, expect } from '@playwright/test';
import sharp from 'sharp';

const origin = 'http://127.0.0.1:4175';
const credentials = { email: 'auteur@example.test', password: 'Test-browser-only-2026!' };
const headers = { origin, accept: 'text/html' };

async function illustration() {
  return sharp({ create: { width: 960, height: 360, channels: 3, background: '#3a2119' } })
    .composite([{ input: { create: { width: 300, height: 240, channels: 3, background: '#d5c0aa' } }, left: 60, top: 60 },
      { input: { create: { width: 480, height: 240, channels: 3, background: '#f5efe8' } }, left: 420, top: 60 }])
    .png().toBuffer();
}

test('tableaux, image importée et rendu public dans les deux thèmes', async ({ page, browser }, testInfo) => {
  await page.context().request.post('/connexion', { form: credentials, headers });
  await page.goto('/admin/articles/nouveau');
  const title = `Le carnet AptOryn ${testInfo.project.name}`;
  await page.getByLabel('Titre', { exact: true }).fill(title);
  await page.getByLabel('Résumé', { exact: true }).fill('Des idées, du code et une identité espresso & crème.');
  const content = page.getByLabel('Contenu de l’article');
  await content.fill('## Une écriture plus riche\n\nDu **gras**, de l’*italique*, du `code` et un [lien](https://example.test).\n\n');
  await page.getByRole('button', { name: 'Tableau', exact: true }).click();
  await expect(content).toHaveValue(/\| Colonne 1 \| Colonne 2 \|/);
  await content.fill((await content.inputValue()) + '\n\n| Fonction | Usage | Format | État |\n| --- | --- | --- | --- |\n| Images | Illustration | WebP | Disponible |\n\n1. Écrire\n2. Publier\n\n<script>window.injected=true</script>\n\n');
  await page.getByRole('button', { name: '＋ Image', exact: true }).click();
  await page.getByLabel('Description de l’image').fill('Palette espresso et crème');
  await page.getByLabel('Importer une image').setInputFiles({ name: 'palette.png', mimeType: 'image/png', buffer: await illustration() });
  await expect(page.getByRole('status').filter({ hasText: 'Image ajoutée' })).toBeVisible();
  const source = await content.inputValue();
  const imageUrl = source.match(/!\[Palette espresso et crème\]\((\/media\/[^)]+)\)/)?.[1];
  expect(imageUrl).toBeTruthy();
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await expect(page.locator('#preview-panel table')).toHaveCount(2);
  await expect(page.locator('#preview-panel strong')).toHaveText('gras');
  await expect(page.getByRole('img', { name: 'Palette espresso et crème' })).toBeVisible();
  await page.locator('button[name="intent"][value="publish"]').click();
  await expect(page.getByText('Votre article est enregistré.', { exact: true })).toBeVisible();
  const visitor = await browser.newContext({ viewport: page.viewportSize()!, colorScheme: 'dark' });
  const publicPage = await visitor.newPage();
  await publicPage.goto('/blog');
  await publicPage.getByRole('link', { name: title, exact: true }).click();
  await expect(publicPage.locator('.blog-prose table')).toHaveCount(2);
  const image = publicPage.getByRole('img', { name: 'Palette espresso et crème' });
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect(await publicPage.evaluate(() => 'injected' in window)).toBe(false);
  expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  const downloaded = await visitor.request.get(imageUrl!);
  expect(downloaded.headers()['content-type']).toBe('image/webp');
  expect(downloaded.headers()['x-content-type-options']).toBe('nosniff');
  await expect(publicPage.locator('html')).toHaveCSS('background-color', 'rgb(11, 7, 6)');
  await publicPage.screenshot({ path: `test-results/markdown-${testInfo.project.name}-dark.png`, fullPage: true });
  await publicPage.getByRole('button', { name: 'Passer au mode clair' }).click();
  await expect(publicPage.locator('html')).toHaveCSS('background-color', 'rgb(255, 252, 248)');
  await publicPage.screenshot({ path: `test-results/markdown-${testInfo.project.name}-light.png`, fullPage: true });
  await publicPage.reload();
  await expect(publicPage.locator('html')).toHaveCSS('background-color', 'rgb(255, 252, 248)');
  await publicPage.getByRole('button', { name: 'Passer au mode sombre' }).click();
  await publicPage.reload();
  await expect(publicPage.locator('html')).toHaveCSS('background-color', 'rgb(11, 7, 6)');
  // The same asset remains readable after navigation and saving the article again.
  await page.getByRole('tab', { name: 'Écrire' }).click();
  await expect(content).toHaveValue(source.trim());
  await page.screenshot({ path: `test-results/markdown-${testInfo.project.name}-editor.png`, fullPage: true });
  await visitor.close();
});

test('envoi protégé : session, origine, type et taille ; erreurs visibles sans perdre le texte', async ({ page, request }) => {
  const file = await illustration();
  const uploadHeaders = { origin, 'content-type': 'image/png' };
  const denied = await request.post('/admin/images', { data: file, headers: uploadHeaders, maxRedirects: 0 });
  expect(denied.status()).toBe(303);
  await page.context().request.post('/connexion', { form: credentials, headers });
  const author = page.context().request;
  expect((await author.post('/admin/images', { data: file, headers: { ...uploadHeaders, origin: 'https://forged.test' } })).status()).toBe(403);
  expect((await author.post('/admin/images', { data: '<svg></svg>', headers: uploadHeaders })).status()).toBe(415);
  expect((await author.post('/admin/images', { data: Buffer.alloc(5 * 1024 * 1024 + 1), headers: uploadHeaders })).status()).toBe(413);
  expect((await request.get('/media/missing.webp')).status()).toBe(404);
  await page.goto('/admin/articles/nouveau');
  await page.getByLabel('Contenu de l’article').fill('Mon contenu à conserver.');
  await page.getByRole('button', { name: '＋ Image', exact: true }).click();
  await page.getByLabel('Importer une image').setInputFiles({ name: 'invalide.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('valide');
  await expect(page.getByLabel('Contenu de l’article')).toHaveValue('Mon contenu à conserver.');
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeEnabled();
});
