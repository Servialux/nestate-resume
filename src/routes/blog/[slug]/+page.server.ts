import { error } from '@sveltejs/kit';
import { getPublishedPost, publicArticle } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
  const post = getPublishedPost(params.slug);
  if (!post) error(404, 'Article introuvable.');
  return {
    post: publicArticle(post),
    canonicalUrl: new URL(`/blog/${post.slug}`, process.env.SITE_URL || url.origin).href
  };
};
