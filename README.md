# Nestate Resume

A French CV, portfolio and personal blog built with SvelteKit and TypeScript, powered by a JSON Resume data file. The visual direction combines midnight blue, ivory, copper, editorial typography, project photography, and a responsive layout. The application now runs as a Node server with a persistent SQLite database.

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
- Public blog at `/blog`, with a separate page for each published article
- Private author area at `/admin`: drafts, safe Markdown preview, publication and withdrawal
- Single-owner email/password login at `/connexion`; no public registration
- Optional automatic LinkedIn sharing when publishing, with encrypted token storage and explicit retry

## Requirements

- Node.js 22.13 or later (includes `node:sqlite`)
- npm
- Chromium installed through Playwright when regenerating PDF files

## Local development

```sh
npm ci --cache .npm-cache
cp .env.example .env
npm run admin:create
npm run check:data
npm run check
npm run build
npm run dev
```

The development server listens on `127.0.0.1`. Open `/connexion` using the credentials chosen in `admin:create`. The command asks for an email and a masked password of at least 12 characters. There is no default password. To replace the owner or recover access, run `npm run admin:create -- --reset` on the server with the same `DATA_DIR`; this revokes existing sessions without deleting articles.

`dev`, `start`, and `admin:create` load `.env` if it exists. `npm run preview` previews the built site; use `npm start` behind HTTPS for production. None of these commands deploys the application.

## Writing and publishing

1. Connect at `/connexion` and choose **Nouvel article** in the author area.
2. Enter a title, a short summary and content. The editor supports paragraphs, headings, lists, quotations and code blocks; HTML is displayed as text.
3. Save a draft or preview the article. Drafts are never available on public routes.
4. Publish the article. Its URL stays stable when its title changes.
5. If LinkedIn is configured, enable sharing for that article before its first publication. Later edits do not create duplicate LinkedIn posts. An explicit share button is available for published articles that have not yet been shared.

Withdrawing an article hides it from the blog. It does not remove an existing LinkedIn post; that post can be managed on LinkedIn.

## LinkedIn connector

At `/admin/linkedin`, enter a **member access token**, the matching author identifier `urn:li:person:…`, and enable the connector. This initial version uses a manually supplied OAuth access token; it does not run an OAuth authorization or refresh-token flow. A Client ID or Client Secret alone is not an access token.

- Create an app in the [LinkedIn developer portal](https://www.linkedin.com/developers/apps), enable **Share on LinkedIn**, and obtain a member access token with `w_member_social` using LinkedIn's token tools or OAuth flow. See [LinkedIn's setup instructions](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin).
- To identify the member, enable **Sign In with LinkedIn using OpenID Connect** and request `openid profile`. The `/v2/userinfo` response includes `sub`; prefix it with `urn:li:person:`. See [LinkedIn OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2). A public profile slug is not this identifier.
- Set `SITE_URL` to the real HTTPS origin of this installation. This is the URL shared on LinkedIn; localhost is refused. Saving settings sends no publication.
- The connector calls the [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) with version `202603`, configurable in the form as LinkedIn versions expire. It shares a title, summary and article link on the member's profile, not a native LinkedIn long-form article or company page.
- Replace expired or revoked tokens in the same form. An empty token field preserves the saved token; disconnecting deletes it. Tokens never appear in page data or error responses.
- A failed share does not undo blog publication. A definitive refusal can be retried from the editor. A timeout or interrupted request is marked **uncertain**: check the LinkedIn profile before explicitly confirming another attempt to avoid duplicates. No background retry runs automatically.

The token is encrypted with AES-256-GCM. By default, a private key is generated at `DATA_DIR/.encryption-key`; alternatively set `DATA_ENCRYPTION_KEY` to a base64-encoded 32-byte key. Keep the key and database together when backing up or moving the installation.

## Build and PDF generation

`npm run build` generates the two PDF files and then builds the Node application into `build/`. The PDF generator uses the pinned Playwright version, blocks external requests, checks A4 dimensions, and fails if content overflows the expected three pages. `SKIP_CV_GENERATION=1 npm run build` keeps the existing PDFs while building the application.

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
- `src/routes/blog/`: public blog and articles
- `src/routes/admin/`: protected editor and LinkedIn configuration
- `src/lib/server/`: SQLite persistence, authentication and LinkedIn integration
- `static/cv/`: generated PDF downloads
- `static/images/`: local portfolio images

## Tests

```sh
npm run test:unit
npm run test:e2e
npm test
```

Unit tests cover the CV helpers, authentication, draft/publication behavior and LinkedIn responses through mocked HTTP calls. Playwright covers the CV plus the complete author workflow on desktop and mobile. Browser tests create a separate temporary database and owner and never use your credentials or publish on LinkedIn. Test artifacts are written to `test-results/` and `playwright-report/`.

## Deployment

### Branches and environments

- `develop` is the integration branch and deploys to Railway **recette**.
- `main` is reserved for Railway **production**, at `https://nestate.site`.
- Validate changes in recette before merging them into main. Pushing develop must never deploy production.
- Recette has its own data volume, owner credentials and LinkedIn settings. Never copy production access tokens into recette for testing.
- `railway.json` defines the Node build, start command and blog health check for this branch. Each Railway environment supplies its own `DATA_DIR`, `ORIGIN` and `SITE_URL`.

For CLI operations, always pass the explicit project, service and environment; do not rely on the linked environment to choose a deployment target.

### Migrating the production service

The previous deployment served static files. The blog requires migrating it to a Node service before release:

1. Remove `RAILPACK_SPA_OUTPUT_DIR` and any static-site start command. Build with `npm run build`, start with `npm start` using Node 22.13 or later.
2. Attach a persistent volume at `/data`, and set `DATA_DIR=/data`. The SQLite database, sessions, articles, connector settings and encryption key must survive redeploys. Run one application instance with this local SQLite store.
3. Set `ORIGIN=https://nestate.site` and `SITE_URL=https://nestate.site` to the actual public domain. Production authentication requires HTTPS.
4. Provision the owner on the running service with `npm run admin:create` and the same volume/environment. Keep `scripts/` and `src/lib/server/` in the deployed image for this command. There is deliberately no public first-user signup.
5. Back up the data volume and encryption key; a database-only restore cannot decrypt a token encrypted with a lost key. To copy a live SQLite database, use SQLite's backup mechanism or stop the service before copying the directory (including WAL files).

For a local production smoke test, `SKIP_CV_GENERATION=1 npm run build` and `npm start` build and start the server. Use HTTPS for production login, or `npm run dev` for local HTTP authoring. Infrastructure configuration and deployment are separate from these source changes.

## License and content

This repository contains personal resume content and project materials. Do not reuse personal information without permission. Portfolio images include their source and license metadata in `src/lib/resume.json`.

## References

- [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure)
- [SvelteKit Node adapter](https://svelte.dev/docs/kit/adapter-node)
- [JSON Resume schema](https://jsonresume.org/schema)
- [Railway deployment documentation](https://docs.railway.com/)
