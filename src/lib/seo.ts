export interface SiteConfig { url: string; indexable: boolean }

export function absoluteUrl(path: string, siteUrl: string): string {
  return new URL(path, `${siteUrl.replace(/\/$/, '')}/`).href;
}

export function metaDescription(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 170) return compact;
  return `${compact.slice(0, 167).replace(/\s+\S*$/, '')}…`;
}

/** Escape script delimiters, including authored article titles/descriptions. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}
