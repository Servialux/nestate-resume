import { listPosts } from '$lib/server/posts';
import { recoverStaleLinkedInShares } from '$lib/server/linkedin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  recoverStaleLinkedInShares();
  return { posts: listPosts(), user: locals.user! };
};
