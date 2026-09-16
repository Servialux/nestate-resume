import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Repository-owned vector composition; rasterized for social crawler compatibility.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0b0706"/>
<rect x="48" y="48" width="1104" height="534" rx="12" fill="#19110e" stroke="#6f4632" stroke-width="2"/>
<text x="96" y="158" fill="#d5c0aa" font-family="Arial, sans-serif" font-size="30" letter-spacing="5">CV &amp; CARNET DE BORD</text>
<text x="90" y="299" fill="#f5efe8" font-family="Arial, sans-serif" font-weight="700" font-size="82">Alexandre Ambiehl</text>
<text x="96" y="378" fill="#d5c0aa" font-family="Arial, sans-serif" font-size="32">Développement · Architecture · Intelligence artificielle</text>
<path d="M96 454H1104" stroke="#6f4632" stroke-width="2"/>
<text x="96" y="526" fill="#d5c0aa" font-family="Arial, sans-serif" font-size="26">nestate.site</text>
</svg>`;
await writeFile('static/images/social-preview.png', await sharp(Buffer.from(svg)).png().toBuffer());
