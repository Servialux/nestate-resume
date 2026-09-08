import { test, expect } from '@playwright/test';

test('Échanger mène depuis le haut de page à la section contact en bas de page', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'Le bouton Échanger du header est masqué par le design mobile.');
  await test.step('Afficher le bouton Échanger en haut de page', async () => {
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: /Échanger/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await testInfo.attach('01 — Avant le clic : haut de page', {
      body: await page.screenshot(), contentType: 'image/png'
    });
  });
  await test.step('Cliquer et vérifier la destination ainsi que le défilement réel', async () => {
    await page.locator('header').getByRole('link', { name: /Échanger/ }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact-title')).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY
    )).toBeLessThanOrEqual(2);
    await testInfo.attach('02 — Après le clic : contact et pied de page', {
      body: await page.screenshot(), contentType: 'image/png'
    });
  });
});

test('les expériences précèdent le profil, sans section projets ni lien associé', async ({ page }) => {
  await page.goto('/');
  const sections = page.locator('main > section').filter({ has: page.locator('.section-kicker') });
  expect(await sections.evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(['parcours', 'profil']);
  await expect(page.locator('.section-kicker')).toHaveText(['01 / PARCOURS', '02 / PROFIL & COMPÉTENCES']);
  await expect(page.locator('#projets, a[href="#projets"]')).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav.getByRole('link')).toHaveText(['Parcours', 'Profil']);
  for (const [label, anchor] of [['Parcours', 'parcours'], ['Profil', 'profil']]) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
    await expect(page.locator(`#${anchor}`)).toBeInViewport();
    // Attendre la fin du défilement animé avant de cliquer le lien suivant.
    await expect.poll(() => page.locator(`#${anchor}`).evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
      const destination = Math.min(top - margin, document.documentElement.scrollHeight - window.innerHeight);
      return Math.abs(window.scrollY - destination);
    })).toBeLessThanOrEqual(2);
  }
});

test('les compétences complémentaires se déplient et le CV JSON est téléchargeable', async ({ page, request }) => {
  await page.goto('/');
  const details = page.locator('#profil details').first();
  await details.locator('summary').click();
  await expect(details.locator('ul')).toBeVisible();
  await details.locator('summary').click();
  await expect(details.locator('ul')).toBeHidden();
  const response = await request.get('/resume.json');
  expect(response.ok()).toBeTruthy();
  const resume = await response.json();
  expect(resume.basics.name).toBeTruthy();
  await expect(page.getByRole('link', { name: /Télécharger le JSON Resume/ })).toHaveAttribute('download', 'resume.json');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: /Télécharger le JSON Resume/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('resume.json');
  expect(await download.failure()).toBeNull();
});
