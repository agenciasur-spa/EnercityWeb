-- ============================================
-- EnercityWeb — Blog de noticias
-- Creates `blog_categories` and `blog_posts` with full-text
-- search, public RLS scoped to published posts, and the
-- table-level grants that RLS alone does not provide
-- (see 20260820120000_cms_content_public_grants.sql).
-- ============================================

CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_name TEXT,
    published_at TIMESTAMPTZ,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
    ON public.blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category
    ON public.blog_posts (category_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector
    ON public.blog_posts USING GIN (search_vector);

-- ─── RLS ────────────────────────────────────────────────────────

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read blog categories' AND tablename = 'blog_categories') THEN
    CREATE POLICY "Public read blog categories"
        ON public.blog_categories FOR SELECT
        TO anon, authenticated
        USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read published posts' AND tablename = 'blog_posts') THEN
    CREATE POLICY "Public read published posts"
        ON public.blog_posts FOR SELECT
        TO anon, authenticated
        USING (status = 'published');
  END IF;
END $$;

-- table-level grant — RLS alone does not expose SELECT to anon/authenticated
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT SELECT ON public.blog_posts TO anon, authenticated;

-- Admin mutations go through supabaseAdmin (service role), which bypasses RLS
-- but still needs the table-level grant — tables created outside the role that
-- owns the default-privilege rule do not inherit it automatically.
GRANT ALL ON public.blog_categories TO service_role;
GRANT ALL ON public.blog_posts TO service_role;

-- ─── updated_at trigger (function created by 20260724120000_create_proyectos.sql) ───

DROP TRIGGER IF EXISTS trigger_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trigger_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
