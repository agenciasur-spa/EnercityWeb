export type PostStatus = 'draft' | 'published';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: string | null;
  status: PostStatus;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithCategory extends BlogPost {
  category: BlogCategory | null;
}

export interface PaginatedPosts {
  posts: BlogPostWithCategory[];
  total: number;
  page: number;
  perPage: number;
}
