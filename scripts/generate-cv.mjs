import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPrintResume } from '../src/lib/print-resume.ts';

// Uses the project's pinned Playwright; no additional package is installed.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
const { chromium } = await import('@playwright/test');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resume = JSON.parse(await readFile(resolve(root, 'src/lib/resume.json'), 'utf8'));
const css = await readFile(resolve(root, 'src/lib/print-resume.css'), 'utf8');
const output = resolve(root, 'static/cv');
await mkdir(output, { recursive:true });
await mkdir(resolve(root, 'test-results/cv'), { recursive:true });
const browser = await chromium.launch();
try {
  for (const variant of ['ats', 'designed']) {
    let markup = renderPrintResume(resume, variant);
    if (variant === 'designed') {
      for (const photo of Object.values(resume.meta?.images?.projects ?? {})) {
        if (!photo.src.startsWith('/images/') || photo.src.includes('..')) continue;
        const data = await readFile(resolve(root, `static${photo.src}`));
        markup = markup.replaceAll(photo.src, `data:image/jpeg;base64,${data.toString('base64')}`);
      }
    }
    const page = await browser.newPage({ viewport:{ width:794, height:1123 } });
    await page.route('**/*', (route) => route.abort());
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${resume.basics.name} — CV ${variant === 'ats' ? 'ATS' : 'couleur'}</title><style>body{margin:0}${css}</style></head><body>${markup}</body></html>`, { waitUntil:'load' });
    await page.emulateMedia({ media:'print' });
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.locator('.cv-page').evaluateAll((pages) => pages.map((p) => ({ height:p.getBoundingClientRect().height, width:p.getBoundingClientRect().width })));
    if (dimensions.some((d) => d.height > 1124 || d.width > 795)) throw new Error(`${variant}: overflowing A4 page: ${JSON.stringify(dimensions)}`);
    const name = variant === 'ats' ? 'alexandre-ambiehl-ats.pdf' : 'alexandre-ambiehl.pdf';
    await page.pdf({ path:resolve(output, name), format:'A4', printBackground:true, preferCSSPageSize:true, tagged:true });
    for (let index = 0; index < 3; index++) await page.locator('.cv-page').nth(index).screenshot({ path:resolve(root, `test-results/cv/${variant}-${index + 1}.png`) });
    await page.close();
    console.log(`Generated ${name} (3 A4 pages).`);
  }
} finally { await browser.close(); }
