import type { SiteConfig } from '../seo.ts';

/** Never use a request Host header to build canonical URLs or a sitemap. */
export function getSiteConfig(environment: NodeJS.ProcessEnv = process.env): SiteConfig {
  let url = 'https://nestate.site';
  let configured = false;
  try {
    const candidate = new URL(environment.SITE_URL || '');
    if (candidate.protocol === 'https:' && !candidate.username && !candidate.password) {
      url = candidate.origin;
      configured = true;
    }
  } catch { /* Public production origin is the safe fallback; indexing stays off. */ }
  const railwayEnvironment = environment.RAILWAY_ENVIRONMENT_NAME;
  const staging = Boolean(railwayEnvironment && railwayEnvironment !== 'production');
  const requested = environment.INDEXING_ENABLED === 'true'
    || (environment.INDEXING_ENABLED !== 'false' && railwayEnvironment === 'production');
  return { url, indexable: configured && !staging && requested };
}
