# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] — 2026-09-08

### Added

- Initial SvelteKit and TypeScript CV and portfolio website.
- JSON Resume data model with a static `/resume.json` endpoint.
- Responsive presentation with light and dark themes.
- Portfolio sections for web applications, generative AI and agents, and connected objects.
- Three-page designed PDF resume and three-page ATS PDF resume.
- Print-specific ATS layout with selectable text and no photography.
- Local project imagery with visible source and license credits.
- Accessibility support for keyboard navigation, focus states, skip links, and reduced motion.
- Unit and Playwright end-to-end test suites.
- Railway static-site deployment at [nestate.site](https://nestate.site).

### Deployment notes

- Railway serves the generated `build/` directory through Caddy.
- `RAILPACK_SPA_OUTPUT_DIR=build` identifies the static output directory.
- Railway builds skip Playwright PDF regeneration because the committed PDF files are already available in `static/cv/`.
