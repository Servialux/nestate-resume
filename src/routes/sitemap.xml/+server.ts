import { base } from '$app/paths';
import { getSiteConfig } from '$lib/server/site';
import { listPosts } from '$lib/server/posts';
import { escapeXml } from '$lib/seo';
import { isDemo } from '$lib/resume';

export const GET = () => {
  const site = getSiteConfig();
  const entries = site.indexable && !isDemo ? [
    { path: `${base}/`, updatedAt: undefined }, { path: `${base}/blog`, updatedAt: undefined },
    ...listPosts(true).map((post) => ({ path: `${base}/blog/${post.slug}`, updatedAt: post.updatedAt }))
  ] : [];
  const content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + entries.map((entry) => `<url><loc>${escapeXml(site.url + entry.path)}</loc>${entry.updatedAt ? `<lastmod>${escapeXml(entry.updatedAt)}</lastmod>` : ''}</url>`).join('')
    + '</urlset>';
  return new Response(content, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
};
