import { test, expect } from '@playwright/test';

test('identité, métier et localisation accessibles sans JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/?source=search');
    await expect(page).toHaveTitle('Alexandre Ambiehl — Développeur PHP/Symfony à Montpellier');
    await expect(page.locator('.hero-location')).toContainText('à Montpellier');
    await expect(page.locator('#contact')).toContainText('France');
    await expect(page.locator('#contact')).toContainText('full remote');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Alexandre Ambiehl.*PHP\/Symfony.*Montpellier.*full remote/);
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
    const website = graph.find((node: Record<string, unknown>) => node['@type'] === 'WebSite');
    const profile = graph.find((node: Record<string, unknown>) => node['@type'] === 'ProfilePage');
    expect(website.name).toBe('Alexandre Ambiehl');
    expect(profile.mainEntity.name).toBe('Alexandre Ambiehl');
    expect(profile.mainEntity['@id']).toBe(website.publisher['@id']);
    expect(profile.mainEntity.homeLocation.address).toMatchObject({ addressLocality: 'Montpellier', addressCountry: 'FR' });
    expect(profile.mainEntity.sameAs).toContain('https://www.linkedin.com/in/alexandre-ambiehl-289120437/');
    expect(profile.mainEntity.image).toBe('https://nestate.site/images/alexandre-ambiehl.jpg');
    await expect(page.getByRole('link', { name: /LinkedIn/ })).toBeVisible();
  } finally { await context.close(); }
});

test('portrait adaptatif et polices locales chargent sans Google Fonts', async ({ page }) => {
  const externalFonts: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url());
  });
  await page.goto('/');
  const portrait = page.getByRole('img', { name: 'Portrait en noir et blanc d’Alexandre Ambiehl.' });
  await expect(portrait).toHaveAttribute('srcset', /480\.webp 480w.*960\.webp 960w/);
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await portrait.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/-(480|960)\.webp$/);
  await page.evaluate(() => document.fonts.ready);
  expect(externalFonts).toEqual([]);
  await expect(page.getByRole('button', { name: 'Imprimer (ATS)' }).first()).toBeEnabled();
});

test('métadonnées SSR cohérentes et recette non indexable', async ({ page, request }) => {
  const warnings: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  for (const path of ['/', '/blog']) {
    const response = await page.goto(`${path}?tracking=ignored`);
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://nestate.site${path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://nestate.site/images/social-preview.png');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('schema.org');
    await page.waitForLoadState('networkidle');
  }
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).not.toContain('Sitemap:');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain('<loc>');
  const missing = await request.get('/blog/not-a-real-article');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(warnings.filter((warning) => warning.includes('hydration'))).toEqual([]);
});
