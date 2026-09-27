import { listPosts, publicArticle } from '$lib/server/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ posts: listPosts(true).map(publicArticle) });
