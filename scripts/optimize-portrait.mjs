import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const resume = JSON.parse(await readFile(new URL('../src/lib/resume.json', import.meta.url), 'utf8'));
const portrait = resume.meta.images.portrait;
for (const variant of portrait.variants ?? []) {
  const result = await sharp(new URL(`../static${portrait.src}`, import.meta.url).pathname)
    .rotate().resize({ width: variant.width }).webp({ quality: 82 })
    .toFile(new URL(`../static${variant.src}`, import.meta.url).pathname);
  console.log(`${variant.src}: ${result.size} bytes`);
}
