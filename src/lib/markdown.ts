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
