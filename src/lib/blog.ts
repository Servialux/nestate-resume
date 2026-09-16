export type LinkedInStatus = 'never' | 'pending' | 'sent' | 'failed' | 'uncertain';

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  shareLinkedIn: boolean;
  linkedinStatus: LinkedInStatus;
  linkedinUrl: string | null;
  linkedinError: string | null;
}
