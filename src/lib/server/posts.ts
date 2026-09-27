import { randomUUID } from 'node:crypto';
import type { Article } from '../blog.ts';
import { getDb } from './db.ts';

type PostRow = Omit<Article, 'shareLinkedIn'> & { shareLinkedIn: number };
const article = (row: unknown): Article => {
  const post = row as PostRow;
  return { ...post, shareLinkedIn: Boolean(post.shareLinkedIn) };
};

export function listPosts(publishedOnly = false): Article[] {
  return getDb().prepare(`SELECT * FROM posts ${publishedOnly ? "WHERE status = 'published'" : ''}
    ORDER BY ${publishedOnly ? 'publishedAt' : 'updatedAt'} DESC, id DESC`).all().map(article);
}

export function getPost(id: string): Article | null {
  const row = getDb().prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return row ? article(row) : null;
}

export function getPublishedPost(slug: string): Article | null {
  const row = getDb().prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").get(slug);
  return row ? article(row) : null;
}

export interface PostInput {
  title: string;
  excerpt: string;
  content: string;
  shareLinkedIn: boolean;
  intent: 'draft' | 'publish' | 'unpublish';
}

export function validatePost(input: PostInput): string | null {
  if (!input.title.trim() || input.title.length > 160) return 'Le titre est obligatoire et limité à 160 caractères.';
  if (input.excerpt.length > 500) return 'Le résumé est limité à 500 caractères.';
  if (input.content.length > 100_000) return 'Le contenu est limité à 100 000 caractères.';
  if (input.intent === 'publish' && (!input.excerpt.trim() || !input.content.trim())) {
    return 'Ajoute un résumé et le contenu de l’article avant de le publier.';
  }
  if (!['draft', 'publish', 'unpublish'].includes(input.intent)) return 'Action inconnue.';
  return null;
}

export function savePost(id: string | null, input: PostInput): Article {
  const invalid = validatePost(input);
  if (invalid) throw new Error(invalid);
  const previous = id ? getPost(id) : null;
  if (id && !previous) throw new Error('Article introuvable.');
  if (previous?.linkedinStatus === 'pending') throw new Error('Le partage LinkedIn est en cours. Attends sa fin avant de modifier cet article.');
  const now = new Date().toISOString();
  const postId = previous?.id ?? randomUUID();
  const title = input.title.trim();
  // The stable suffix avoids collisions; changing a title never breaks a published URL.
  const slug = previous?.slug ?? `${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'article'}-${postId.slice(0, 8)}`;
  const status = input.intent === 'publish' ? 'published' : 'draft';
  const publishedAt = status === 'published' ? previous?.publishedAt ?? now : previous?.publishedAt ?? null;
  getDb().prepare(`INSERT INTO posts (id,slug,title,excerpt,content,status,createdAt,updatedAt,publishedAt,shareLinkedIn)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,status=excluded.status,
    updatedAt=excluded.updatedAt,publishedAt=excluded.publishedAt,shareLinkedIn=excluded.shareLinkedIn`)
    .run(postId, slug, title, input.excerpt.trim(), input.content.trim(), status,
      previous?.createdAt ?? now, now, publishedAt, Number(input.shareLinkedIn));
  return getPost(postId)!;
}

// Private sharing errors and configuration never belong in the public page data.
export function publicArticle(post: Article): Article {
  return { ...post, shareLinkedIn: false, linkedinStatus: 'never', linkedinUrl: null, linkedinError: null };
}
