# Nestate Resume

A French CV and portfolio website built with SvelteKit and TypeScript, powered by a JSON Resume data file. The visual direction combines midnight blue, ivory, copper, editorial typography, project photography, and a responsive layout. The site is generated as a static website and deployed on Railway.

Live website: [nestate.site](https://nestate.site)

## Features

- Responsive CV and portfolio presentation
- JSON Resume data source at `src/lib/resume.json`
- Static `/resume.json` download endpoint
- Designed and ATS-friendly PDF downloads
- Print-specific ATS layout with three A4 pages
- Keyboard-accessible navigation, visible focus states, skip link, and reduced-motion support
- Light and dark themes
- Local project images with visible credits
- No analytics, tracking, or contact form service

## Requirements

- Node.js 22.12 or later
- npm
- Chromium installed through Playwright when regenerating PDF files

## Local development

```sh
npm ci --cache .npm-cache
npm run check:data
npm run check
npm run build
npm run dev
```

The development server listens on `127.0.0.1`. Use `npm run preview` to preview the generated static site. None of these commands deploys the application.

## Build and PDF generation

`npm run build` generates the two PDF files and then builds the static site into `build/`. The PDF generator uses the pinned Playwright version, blocks external requests, checks A4 dimensions, and fails if content overflows the expected three pages.

Railway sets `RAILWAY_ENVIRONMENT_ID`, so its build skips PDF regeneration and uses the already committed files in `static/cv/`. This keeps the deployment image small and avoids requiring a browser in the static-site builder.

To install the browser locally:

```sh
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

## Updating the resume

1. Edit `src/lib/resume.json`, the single source of truth for the public resume content.
2. Review `basics`, `work`, `education`, `skills`, `projects`, and `languages`.
3. Keep only information intended for public distribution. The complete JSON Resume document is available at `/resume.json`.
4. Set `meta.demo` to `false` and remove `meta.demoNotice` only after all content has been reviewed.
5. Run the data check, type check, build, and tests before deploying.

The project does not invent contact details, location, language levels, or personal photography. Confidential project details are intentionally omitted.

## Project structure

- `src/routes/+page.svelte`: page composition and portfolio content
- `src/app.css`: theme, responsive design, print rules, and accessibility styles
- `src/lib/resume.ts`: resume types and formatting helpers
- `src/lib/print-resume.ts`: printable resume renderer
- `src/lib/print-resume.css`: isolated print document styles
- `src/routes/resume.json/+server.ts`: static JSON Resume endpoint
- `static/cv/`: generated PDF downloads
- `static/images/`: local portfolio images

## Tests

```sh
npm run test:unit
npm run test:e2e
npm test
```

The unit tests cover date formatting, link filtering, and image paths. The Playwright tests cover desktop and mobile navigation, section ordering, portfolio details, the contact interaction, and JSON Resume download behavior. Test artifacts are written to `test-results/` and `playwright-report/`.

## Deployment

The application is deployed as a Railway static site. The service uses the `build` output directory and the `RAILPACK_SPA_OUTPUT_DIR=build` environment variable. A deployment from the project root can be started with:

```sh
railway up
```

## License and content

This repository contains personal resume content and project materials. Do not reuse personal information without permission. Portfolio images include their source and license metadata in `src/lib/resume.json`.

## References

- [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure)
- [SvelteKit static adapter](https://svelte.dev/docs/kit/adapter-static)
- [JSON Resume schema](https://jsonresume.org/schema)
- [Railway deployment documentation](https://docs.railway.com/)
