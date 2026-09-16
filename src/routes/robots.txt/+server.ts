import { base } from '$app/paths';
import { getSiteConfig } from '$lib/server/site';
import { isDemo } from '$lib/resume';

export const GET = () => {
  const site = getSiteConfig();
  // Allow crawling so robots can actually read the noindex response/meta tags.
  const content = site.indexable && !isDemo
    ? `User-agent: *\nAllow: /\nSitemap: ${site.url}${base}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n# Indexing disabled with X-Robots-Tag and HTML noindex.\n';
  return new Response(content, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
};
