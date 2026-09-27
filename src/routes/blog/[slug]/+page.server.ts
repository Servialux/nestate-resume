import { base } from '$app/paths';
import { getSiteConfig } from '$lib/server/site';
import { firstMarkdownImage } from '$lib/markdown';
import { error } from '@sveltejs/kit';
import { getPublishedPost, publicArticle } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const post = getPublishedPost(params.slug);
  if (!post) error(404, 'Article introuvable.');
  const canonicalUrl = `${getSiteConfig().url}${base}/blog/${post.slug}`;
  const image = firstMarkdownImage(post.content);
  return {
    post: publicArticle(post),
    canonicalUrl,
    socialImage: image ? { ...image, src: new URL(image.src, canonicalUrl).href } : undefined
  };
};
