import { test, expect } from '@playwright/test';

test('le téléchargement fournit le PDF couleur et le bouton imprime le CV ATS', async ({ page, request }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.print-resume')).toBeHidden();
  const link = page.getByRole('link', { name:'Télécharger le CV PDF' });
  await expect(link).toBeVisible();
  const response = await request.get('/cv/alexandre-ambiehl.pdf');
  expect(response.ok()).toBeTruthy();
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const pending = page.waitForEvent('download');
  await link.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('CV-Alexandre-Ambiehl.pdf');
  expect(await download.failure()).toBeNull();

  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printCalled = 'yes'; }; });
  await page.getByRole('button', { name:'Imprimer (ATS)' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-print-called', 'yes');
  await page.emulateMedia({ media:'print' });
  // A4 is the print viewport even when the button was used on mobile.
  await page.setViewportSize({ width:794, height:1123 });
  await expect(page.locator('.shell')).toBeHidden();
  await expect(page.locator('.print-resume')).toBeVisible();
  await expect(page.locator('.cv-document h1')).toHaveText('Alexandre Ambiehl');
  await expect(page.locator('.cv-document img,.cv-document .cv-photo')).toHaveCount(0);
  await expect(page.locator('.cv-document')).toContainText('Woippy Protection');
  await expect(page.locator('.cv-document')).toContainText('Symfony AI');
  const pages = page.locator('.cv-page');
  await expect(pages).toHaveCount(3);
  const geometry = await pages.evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const footer = node.querySelector('.cv-footer')!.getBoundingClientRect();
    const content = Array.from(node.children).filter((child) => !child.classList.contains('cv-footer'));
    return { height:bounds.height, width:bounds.width, bottom:Math.max(...content.map((child) => child.getBoundingClientRect().bottom)), footerTop:footer.top };
  }));
  for (const value of geometry) {
    expect(value.height).toBeLessThanOrEqual(1124);
    expect(value.width).toBeLessThanOrEqual(795);
    expect(value.bottom).toBeLessThan(value.footerTop);
  }
  await page.pdf({ path:testInfo.outputPath('impression-ats.pdf'), format:'A4', preferCSSPageSize:true, printBackground:true, tagged:true });
  await testInfo.attach('Impression ATS depuis le site', { path:testInfo.outputPath('impression-ats.pdf'), contentType:'application/pdf' });
});
