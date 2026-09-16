import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = 'http://127.0.0.1:4175';
const headers = { origin, accept: 'text/html' };

for (const theme of ['light', 'dark'] as const) {
  test(`accessibilité WCAG : pages publiques et espace auteur (${theme})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    async function audit(path: string) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.map((node) => ({ target: node.target, reason: node.failureSummary })) })), path).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBeTruthy();
    }
    for (const path of ['/', '/blog', '/connexion']) await audit(path);
    await page.context().request.post('/connexion', { headers, form: { email: 'auteur@example.test', password: 'Test-browser-only-2026!' } });
    for (const path of ['/admin', '/admin/linkedin', '/admin/articles/nouveau']) await audit(path);
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    const uploadResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(uploadResults.violations).toEqual([]);
    await page.getByLabel('Titre', { exact: true }).fill(`Article accessible ${theme} ${testInfo.project.name}`);
    await page.getByLabel('Résumé', { exact: true }).fill('Un article avec une structure de titres, un tableau et des liens explicites.');
    await page.getByLabel('Contenu de l’article').fill('# Une section\n\n### Un détail\n\n| Sujet | État |\n| --- | --- |\n| Accessibilité | Vérifiée |\n\n[Lire la documentation Svelte](https://svelte.dev)');
    await page.getByRole('tab', { name: 'Aperçu' }).click();
    const previewResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(previewResults.violations).toEqual([]);
    await page.locator('button[name="intent"][value="publish"]').click();
    const publicPath = await page.getByRole('link', { name: /Voir l’article/ }).getAttribute('href');
    await audit(publicPath!);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.blog-prose th').first()).toHaveAttribute('scope', 'col');
  });
}

test('navigation clavier, focus du lien d’évitement et onglets de l’éditeur', async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog');
  await page.waitForLoadState('networkidle');
  // WebKit on macOS uses Option+Tab to include links in keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  const skip = page.getByRole('link', { name: 'Aller au contenu' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.context().request.post('/connexion', { headers, form: { email: 'auteur@example.test', password: 'Test-browser-only-2026!' } });
  await page.goto('/admin/articles/nouveau');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: 'Écrire', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Aperçu' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Aperçu' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Écrire', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Image', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Description de l’image')).toBeFocused();
});

test('icônes SVG rendues dès le HTML et page utilisable à 320 pixels', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('lucide');
  expect(html).not.toMatch(/[↗↘↓↑←]/);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/', '/blog', '/connexion']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBeTruthy();
    for (const icon of await page.locator('svg.ui-icon').all()) {
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
      await expect(icon).toHaveAttribute('focusable', 'false');
    }
  }
});
