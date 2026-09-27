import { test, expect } from '@playwright/test';

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
