import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: false });

// Only web links, email links and relative URLs are accepted. Data URLs and
// authored HTML cannot bypass the image upload validation.
markdown.validateLink = (url: string) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url, 'https://markdown.invalid').protocol);
  } catch { return false; }
};
markdown.renderer.rules.table_open = () => '<div class="blog-table-scroll" role="region" aria-label="Tableau de l’article" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';
markdown.renderer.rules.th_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet('scope', 'col');
  return self.renderToken(tokens, index, options);
};
// The article title owns h1. Keep authored sections in a navigable hierarchy.
markdown.core.ruler.push('article_headings', (state) => {
  let previous = 1;
  const ids = new Set<string>();
  for (let index = 0; index < state.tokens.length; index++) {
    const token = state.tokens[index];
    if (token.type !== 'heading_open') continue;
    const level = Math.min(Math.max(2, Number(token.tag.slice(1))), previous + 1);
    previous = level;
    token.tag = `h${level}`;
    state.tokens[index + 2].tag = token.tag;
    const title = state.tokens[index + 1].content;
    const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = `section-${slug}`;
    let count = 1;
    while (ids.has(id)) id = `section-${slug}-${++count}`;
    ids.add(id);
    token.attrSet('id', id);
  }
});
const renderImage = markdown.renderer.rules.image!;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  tokens[index].attrSet('loading', 'lazy');
  tokens[index].attrSet('decoding', 'async');
  tokens[index].attrSet('referrerpolicy', 'no-referrer');
  return renderImage(tokens, index, options, env, self);
};

/** Identical rendering for the editor preview, SSR and public articles. */
export function renderMarkdown(source: string): string {
  return markdown.render(source);
}

/** Prefer the first authored image for link previews, without interpreting HTML. */
export function firstMarkdownImage(source: string): { src: string; alt: string } | undefined {
  const tokens = markdown.parse(source, {});
  for (const block of tokens) {
    for (const token of block.children ?? []) {
      const src = token.attrGet('src');
      if (token.type === 'image' && typeof src === 'string' && src && !src.startsWith('mailto:')) return { src, alt: token.content };
    }
  }
}
