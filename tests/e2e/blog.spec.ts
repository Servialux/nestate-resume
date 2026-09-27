import { test, expect } from '@playwright/test';

test('les pages auteur et les actions exigent une connexion', async ({ page, request }) => {
  await page.goto('/admin/articles/nouveau');
  await expect(page).toHaveURL(/\/connexion$/);
  const denied = await request.post('/admin/articles/nouveau?/save', {
    form: { title: 'Accès interdit', intent: 'draft' }, headers: { origin: 'http://127.0.0.1:4175' }, maxRedirects: 0
  });
  expect(denied.status()).toBe(303);
  expect(denied.headers().location).toBe('/connexion');
});

test('rédiger, publier, modifier, retirer un article et se déconnecter', async ({ page, browser }, testInfo) => {
  const title = `Carnet de développement ${testInfo.project.name}`;
  await page.goto('/connexion');
  await page.getByLabel(/Adresse e-mail/i).fill('auteur@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Test-browser-only-2026!');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const cookie = (await page.context().cookies()).find((item) => item.name === 'nestate_session');
  expect(cookie?.httpOnly).toBeTruthy();
  expect(cookie?.sameSite).toBe('Lax');
  await page.goto('/admin/articles/nouveau');
  await page.getByLabel('Titre', { exact: true }).fill(title);
  await page.getByLabel(/Résumé/).fill('Les coulisses d’un article de blog.');
  await page.getByLabel(/Contenu/).fill('## Un article\n\nUn contenu publié.\n\n<script>window.injected=true</script>');
  await page.locator('button[name="intent"][value="draft"]').click();
  await expect(page).toHaveURL(/\/admin\/articles\/[a-f0-9-]+/);
  const editUrl = page.url();
  await page.screenshot({ path: `test-results/blog-${testInfo.project.name}-editor.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto('/blog');
  await expect(publicPage.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
  await page.locator('button[name="intent"][value="publish"]').click();
  await expect(page.getByText('Article publié.', { exact: false }).first()).toBeVisible();
  await publicPage.reload();
  await publicPage.getByRole('link', { name: new RegExp(title) }).first().click();
  await expect(publicPage).toHaveURL(/\/blog\/.+/);
  await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const publicUrl = publicPage.url();
  await publicPage.screenshot({ path: `test-results/blog-${testInfo.project.name}-public.png`, fullPage: true });
  expect(await publicPage.evaluate(() => 'injected' in window)).toBe(false);
  await page.getByLabel('Titre', { exact: true }).fill(`${title} — mise à jour`);
  await page.locator('button[name="intent"][value="publish"]').click();
  await expect(page.getByText('Votre article est enregistré.', { exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { name: `${title} — mise à jour`, exact: true })).toBeVisible();
  expect(publicPage.url()).toBe(publicUrl);
  await page.locator('button[name="intent"][value="unpublish"]').click();
  await expect(page.getByText(/Brouillon enregistré/)).toBeVisible();
  const removed = await publicPage.goto(publicUrl);
  expect(removed?.status()).toBe(404);
  await page.goto('/admin/linkedin');
  await expect(page.locator('input[name="accessToken"]')).toHaveValue('');
  await page.screenshot({ path: `test-results/blog-${testInfo.project.name}-linkedin.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.getByRole('button', { name: /déconnecter/i }).first().click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto(editUrl);
  await expect(page).toHaveURL(/\/connexion$/);
  await visitor.close();
});
